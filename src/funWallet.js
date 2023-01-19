const fetch = require("node-fetch")
const { wrapProvider } = require("../utils/Provider")
const { TreasuryAPI } = require("../utils/TreasuryAPI")
const { generateSha256 } = require("../utils/tools")
const { WrappedEthersContract } = require("../utils/WrappedEthersContract")
const { HttpRpcClient } = require('@account-abstraction/sdk')

const Action = require("../utils/abis/Action.json")
const ERCToken = require('../utils/abis/ERC20.json');
const Treasury = require("../utils/abis/Treasury.json")
const ethers = require('ethers')

const abi = ethers.utils.defaultAbiCoder;
const MAX_INT = "0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
const APIURL = 'https://vyhjm494l3.execute-api.us-west-2.amazonaws.com/dev'

class FunWallet {

    /**
    * Standard constructor
    * @params eoa, preFundAmt, index
    * eoa - ethers.Wallet object
    * preFundAmt - amount to prefund the wallet with, in eth/avax
    * index - index of account (default 0)
    */


    constructor(eoa, schema, prefundAmt, chain, apiKey, index = 0) {
        this.eoa = eoa
        this.prefundAmt = prefundAmt
        this.schema = schema
        this.actionsStore = this.schema.actionsStore
        this.index = index
        this.chain = chain
        this.apiKey = apiKey
    }
    contracts = {}

    /**     
    * Runs initialization for a given wallet.
    * The function acts as a constructor for many parameters in the class, creating
    * an abstracted wallet account, with the correct providers and rpc client. 
    * It also prefunds the account with the amount of eth/avax desired.
    * 
    * USER SIGNATURE REQUIRED to fund wallet
    * 
    * @params eoa, preFundAmt, index
    * eoa - ethers.Wallet object (user's eoa account)
    * preFundAmt - amount to prefund the wallet with, in eth/avax
    * index - index of account (default 0)
    */
    async init() {
        const prefundAmt = this.prefundAmt
        let chainInfo = await FunWallet.getChainInfo(this.chain)

        this.bundlerUrl = chainInfo.rpcdata.bundlerUrl
        this.rpcurl = chainInfo.rpcdata.rpcurl
        this.entryPointAddress = chainInfo.aaData.entryPointAddress
        this.factoryAddress = chainInfo.aaData.factoryAddress
        this.AaveActionAddress = chainInfo.actionData.aave


        this.provider = new ethers.providers.JsonRpcProvider(this.rpcurl);
        this.config = { bundlerUrl: this.bundlerUrl, entryPointAddress: this.entryPointAddress }

        const net = await this.provider.getNetwork()
        this.chainId = net.chainId

        this.rpcClient = new HttpRpcClient(this.bundlerUrl, this.entryPointAddress, this.chainId)
        this.erc4337Provider = await wrapProvider(this.provider, this.config, this.eoa, this.factoryAddress)

        this.accountApi = new TreasuryAPI({
            provider: this.erc4337Provider,
            entryPointAddress: this.entryPointAddress,  //check this
            owner: this.eoa,
            factoryAddress: this.factoryAddress,
            index: this.index
        })
        this.address = await this.accountApi.getAccountAddress()

        const treasury = new ethers.Contract(this.address, Treasury.abi, this.eoa)
        this.contracts[this.address] = new WrappedEthersContract(this.eoa, this.provider, this.chainId, treasury)
        if (prefundAmt) {
            const amt = ethers.utils.parseEther(prefundAmt.toString())
            const prefundReceipt = await this.preFund(amt)
            return prefundReceipt
        }
    }

    async preFund(amt) {
        const tx = await this.eoa.sendTransaction({ to: this.address, from: await this.eoa.getAddress(), value: amt })
        return await tx.wait()
    }

    async deployActionTx(op) {
        const userOpHash = await this.rpcClient.sendUserOpToBundler(op)
        const txid = await this.accountApi.getUserOpReceipt(userOpHash)
        //log
        const outOp = await FunWallet._getPromiseFromOp(op)
        FunWallet._storeUserOpInternal(outOp, userOpHash, this.apiKey, 'fun', 'deploy_wallet')
        return { userOpHash, txid }
    }

    static async deployActionTx(op, apikey, chain = "43113") {
        let chainInfo = await FunWallet.getChainInfo(chain)
        const bundlerUrl = chainInfo.rpcdata.bundlerUrl
        const rpcurl = chainInfo.rpcdata.rpcurl
        const entryPointAddress = chainInfo.aaData.entryPointAddress
        const factoryAddress = chainInfo.aaData.factoryAddress
        const AaveActionAddress = chainInfo.actionData.aave

        const provider = new ethers.providers.JsonRpcProvider(rpcurl);
        const chainId = (await provider.getNetwork()).chainId
        const rpcClient = new HttpRpcClient(bundlerUrl, entryPointAddress, chainId)
        const accountApi = new TreasuryAPI({
            provider: provider,
            entryPointAddress: entryPointAddress,  //check this
            factoryAddress: factoryAddress
        })
        const userOpHash = await rpcClient.sendUserOpToBundler(op)
        const txid = await accountApi.getUserOpReceipt(userOpHash)
        //log 
        await this._storeUserOp(op, apikey, 'deploy_action')

        return { userOpHash, txid }
    }


    /**
    * adds type of action for FunWallet
    * @params type, params
    * type - string of "AAVE" (uniswap and more will be supported later)
    * params - parameters to insert, (token address)
    */
    addAction(info) {
        this.actionStore.push(info)
    }

    async _createAction({ to, data }, gasLimit, noInit = false, calldata = false) {
        //info.data is calldata
        return await this.accountApi.createSignedUserOp({ target: to, data, noInit, gasLimit, calldata })
    }

    async _createUnsignedAction({ to, data }, gasLimit, noInit = false, calldata = false) {
        //
        return await this.accountApi.createUnsignedUserOp({ target: to, data, noInit, gasLimit, calldata })
    }

    async _createWalletInitData({ type, params }) {
        switch (type) {
            case "AAVE": {
                return await this._createAAVEWithdrawal(params)
            }
        }
    }

    async _createAAVEWithdrawal(params) {
        this.params = params
        const tokenAddr = this.params[0]

        this._initActionContract(this.AaveActionAddress)

        const eoaAddr = await this.eoa.getAddress()
        const input = [eoaAddr, tokenAddr]
        const key = generateSha256(input)
        const aaveData = abi.encode(["address", "address", "string"], [...input, key]);
        const actionInitData = await this.contracts[this.AaveActionAddress].getMethodEncoding("init", [aaveData])
        const balance = await this.contracts[tokenAddr].callMethod("balanceOf", [eoaAddr])
        console.log("balance "+ balance)
        return actionInitData

    }

    async _createAAVEWithdrawalExec({ params }) {
        this.params = params
        const tokenAddr = this.params[0]
        this._initActionContract(this.AaveActionAddress)

        const eoaAddr = await this.eoa.getAddress()
        const input = [eoaAddr, tokenAddr]
        const key = generateSha256(input)
        const aaveexec = abi.encode(["string"], [key])
        const actionExec = await this.contracts[this.AaveActionAddress].getMethodEncoding("execute", [aaveexec])
        const actionExecutionOp = await this._createAction(actionExec, 500000, true)
        await FunWallet._storeUserOp(actionExecutionOp, this.apiKey, 'create_action') //log 

        return actionExecutionOp
    }



    async createActionTx(action) {
        return this._createAAVEWithdrawalExec(action)
    }

    async createActionTxs(actions) {
        return await Promise.all(actions.map((action) => {
            return this._createAAVEWithdrawalExec(action)
        }))
    }

    async createAllActionTx() {
        return await Promise.all(Object.values(this.actionStore).map((action) => {
            return this._createAAVEWithdrawalExec(action)
        }))
    }

    /**
    * Liquidates one's aave position
    * @params opHash - execution hash from deploying the wallet
    * @return {receipt, executionHash} 
    * userOpHash - string hash of the UserOperation 
    * txid - transaction id of transfer of assets
    */
    static async executeAction(opHash = "", userOp = false) {
        if (!userOp && opHash) {
            userOp = await this._getStoredUserOp(opHash)
        }
        return await this.deployActionTx(userOp)
    }
    static async _storeUserOp(op, apikey, type) {
        const outOp = await this._getPromiseFromOp(op)
        const sig = generateSha256(outOp.signature.toString())
        await this._storeUserOpInternal(outOp, sig, apikey, 'fun', type) //storing the customer name, should this be done somehow differently? 
        return sig
    }
    static async _storeUserOpInternal(userOp, userOpHash, apikey, user, type) {
        try{
            await fetch(`${APIURL}/save-user-op`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Api-Key': apikey
                },
                redirect: 'follow',
                referrerPolicy: 'no-referrer',
                body: JSON.stringify({
                    userOpHash: userOpHash,
                    userOp: userOp,
                    user,
                    type
                })
            }).then((r) => r.json()).then((r) => { console.log(r.message + " type: " + type) })
        }
        catch(e){
            console.log(e)
        }
        
    }


    static async _getPromiseFromOp(op) {
        const out = {}
        await Promise.all(Object.keys(op).map(async (key) => {
            out[key] = await op[key]
        }))
        return out
    }
    static async _getStoredUserOp(opHash) {
        const op = await this._getUserOpInternal(opHash)
        Object.keys(op).map(key => {
            if (op[key].type == "BigNumber") {
                op[key] = ethers.BigNumber.from(op[key].hex)
            }
        })
        return op
    }
    async _getUserOpInternal(userOpHash) {
        try {
            return await fetch(`${APIURL}/get-user-op`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Api-Key': this.apiKey
                },
                redirect: 'follow',
                referrerPolicy: 'no-referrer',
                body: JSON.stringify({
                    userOpHash: userOpHash,
                })
            }).then((r) => r.json()).then((r) => { return r.data })
        } catch (e) {
            console.log(e)
        }
    }

    /**
    * Deploys a wallet to chain that can initiate aave liquidation
    * @return {receipt, executionHash} 
    * receipt - receipt of transaction committed to chain.
    * executionHash - string hash of the UserOperation 
    */
    async deploy() {
        await this.init()
        const actionCreateData = { to: [], data: [] }
        await Promise.all(Object.values(this.actionsStore).map(async (actionData) => {
            const actionInitData = await this._createWalletInitData(actionData)
            const { to, data } = actionInitData
            actionCreateData.to.push(to)
            actionCreateData.data.push(data)
        }))
        const createWalleteData = await this.contracts[this.address].getMethodEncoding("execBatch", [actionCreateData.to, actionCreateData.data])

        const op = await this._createAction(createWalleteData, 560000)

        return await this.deployActionTx(op)
    }

    /**
    * Grants approval to controller wallet to liquidate funds
    * @return {receipt} 
    * receipt - TransactionReceipt of the approval confirmed on chain
    */


    _initTokenContract(address) {
        if (this.contracts[address]) {
            return
        }
        const token = new ethers.Contract(address, ERCToken.abi, this.eoa)
        this.contracts[address] = new WrappedEthersContract(this.eoa, this.provider, this.chainId, token)
    }
    _initActionContract(address) {
        if (this.contracts[address]) {
            return
        }
        const action = new ethers.Contract(address, Action.abi, this.eoa)
        this.contracts[address] = new WrappedEthersContract(this.eoa, this.provider, this.chainId, action)
    }

    static async getChainInfo(chain) {
        return await fetch(`${APIURL}/get-chain-info`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            redirect: 'follow',
            referrerPolicy: 'no-referrer',
            body: JSON.stringify({
                chain,
            })
        }).then((r) => r.json()).then((r) => {
            return r.data
        })
    }

    async deployTokenApproval(aTokenAddress, amount = MAX_INT) {
        this._initTokenContract(aTokenAddress)
        const ethTx = await this.contracts[aTokenAddress].createUnsignedTransaction("approve", [this.address, amount])
        const submittedTx = await this.eoa.sendTransaction(ethTx);
        const receipt = await submittedTx.wait()

        //log receipt
        await this.storeEVMCall(receipt, 'fun')

        return receipt
    }
    async storeEVMCall(receipt, user) {
        try {
            return await fetch(`http://localhost:3000/evmcalls/saveReceipt`, { ///save-evm-receipt
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Api-Key': this.apiKey
                },
                redirect: 'follow',
                referrerPolicy: 'no-referrer',
                body: JSON.stringify({
                    txHash: receipt.transactionHash,
                    receipt,
                    organization: user
                })
            }).then(r => r.json()).then(r => console.log(r.message + " type: evm_receipt"))
        }
        catch (e) {
            console.log(e)
        }

    }
}

module.exports = { FunWallet }

