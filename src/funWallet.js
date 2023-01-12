const fetch = require("node-fetch")
const { wrapProvider } = require("../utils/Provider")
const { TreasuryAPI } = require("../utils/TreasuryAPI")
const { generateSha256 } = require("../utils/tools")


const { WrappedEthersContract, wrapMultipleContracts } = require("../utils/WrappedEthersContract")

const { HttpRpcClient } = require('@account-abstraction/sdk')

const Action = require("../utils/abis/Action.json")
const ERCToken = require('../utils/abis/ERC20.json');
const Treasury = require("../utils/abis/Treasury.json")


const ethers = require('ethers')

const abi = ethers.utils.defaultAbiCoder;

// bundlerUrl = "http://localhost:3000/rpc"
// const bundlerUrl = "http://54.184.167.23:3000/rpc"
// const rpcurl = "https://avalanche-fuji.infura.io/v3/4a1a0a67f6874be6bb6947a62792dab7"
// const entryPointAddress = "0xCf64E11cd6A6499FD6d729986056F5cA7348349D"
// const factoryAddress = "0xCb8b356Ab30EA87d62Ed1B6C069Ef3E51FaDF749"
// const AaveActionAddress = "0x672d9623EE5Ec5D864539b326710Ec468Cfe0aBE"
// const MAX_INT = "0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"

class FunWallet {
    /**
    * Standard constructor
    * @params eoa, preFundAmt, index
    * eoa - ethers.Wallet object
    * preFundAmt - amount to prefund the wallet with, in eth/avax
    * index - index of account (default 0)
    */


    constructor(eoa, actions, index = 0) {
        this.eoa = eoa
        this.actions = actions
        this.index = index
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

     async init(prefundAmt) {

        let [_t, chainInfo] = await this.getChainInfo(this.chain)
        console.log(chainInfo[1])

        this.bundlerUrl = chainInfo.rpcdata.bundlerUrl
        this.rpcurl = chainInfo.rpcdata.rpcUrl
        this.entryPointAddress = chainInfo.aaData.entryPointAddress
        this.factoryAddress = chainInfo.aaData.factoryAddress
        this.AaveActionAddress = chainInfo.actionData.aave
        // console.log(this.chainInfo)

        this.provider = new ethers.providers.JsonRpcProvider(this.rpcurl);
        this.config = { bundlerUrl: this.bundlerUrl, entryPointAddress: this.entryPointAddress }
        this.provider = new ethers.providers.JsonRpcProvider(rpcurl);
        this.config = { bundlerUrl, entryPointAddress }

        const net = await this.provider.getNetwork()
        this.chainId = net.chainId

        this.rpcClient = new HttpRpcClient(bundlerUrl, entryPointAddress, this.chainId)
        this.erc4337Provider = await wrapProvider(this.provider, this.config, this.eoa, factoryAddress)

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

        const amt = ethers.utils.parseEther(prefundAmt.toString())
        const prefundReceipt = await this.preFund(amt)
        return prefundReceipt
    }

    async preFund(amt) {
        const tx = await this.eoa.sendTransaction({ to: this.address, from: await this.eoa.getAddress(), value: amt })
        return await tx.wait()
    }

    async sendOpToBundler(op) {
        const userOpHash = await this.rpcClient.sendUserOpToBundler(op)
        const txid = await this.accountApi.getUserOpReceipt(userOpHash)
        return { userOpHash, txid }
    }

    static async sendOpToBundler(op) {
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

    async _createAction({ to, data }, gasLimit, noInit = false) {
        return await this.accountApi.createSignedUserOp({ target: to, data, noInit, gasLimit })
    }

    async _createUnsignedAction({ to, data }, gasLimit, noInit = false, calldata = false) {
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

        this._initActionContract(AaveActionAddress)

        const eoaAddr = await this.eoa.getAddress()
        const input = [eoaAddr, tokenAddr]

        const key = this.generateSha256(input.toString())
        const aaveData = abi.encode(["address", "address", "string"], [...input, key]);
        const actionInitData = await this.contracts[AaveActionAddress].getMethodEncoding("init", [aaveData])
        return actionInitData

    }

    async _createAAVEWithdrawalExec(params) {
        this.params = params
        const tokenAddr = this.params[0]

        const eoaAddr = await this.eoa.getAddress()
        const input = [eoaAddr, tokenAddr]
        const key = this.generateSha256(input.toString())

        const aaveexec = abi.encode(["string"], [key])
        const actionExec = await this.contracts[AaveActionAddress].getMethodEncoding("execute", [aaveexec])
        const actionExecutionOp = await this._createAction(actionExec, 500000, true)
        return actionExecutionOp
    }

    async getWalletOps() {
        const actionCreateData = { to: [], data: [] }
        const executionOps = await Promise.all(Object.values(this.actionStore).map(async (actionData) => {
            const actionInitData = await this._createWalletInitData(actionData)
            const { to, data } = actionInitData
            actionCreateData.to.push(to)
            actionCreateData.data.push(data)
            return actionExecutionOp
        }))
        return { createWalletOp, executionOps }

    }

    async initializeWallet() {
        const actionCreateData = { to: [], data: [] }
        await Promise.all(Object.values(this.actionStore).map(async (actionData) => {
            const actionInitData = await this._createWalletInitData(actionData)
            const { to, data } = actionInitData
            actionCreateData.to.push(to)
            actionCreateData.data.push(data)
        }))
        const createWalleteData = await this.contracts[this.address].getMethodEncoding("execBatch", [actionCreateData.to, actionCreateData.data])
        const op = await this._createAction(createWalleteData, 560000, true)
        return await this.sendOpToBundler(op)
    }

    async createExecutionOp(action) {
        return _createAAVEWithdrawalExec(action)
    }

    async createExecutionOps(actions) {
        return await Promise.all(actions.map((action) => {
            return _createAAVEWithdrawalExec(action)
        }))
    }

    async createAllExecutionOps() {
        return await Promise.all(Object.values(this.actionStore).map((action) => {
            return _createAAVEWithdrawalExec(action)
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
        return await this.sendOpToBundler(userOp)
    }
    async _storeUserOp(op) {
        const outOp = await this._getPromiseFromOp(op)
        const sig = this._sha256(outOp.signature.toString())
        await this._storeUserOpInternal(outOp, sig, 'immuna')
        return sig
    }
    async _getPromiseFromOp(op) {
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
    static async _getUserOpInternal(userOpHash) {
        return await fetch('http://34.222.30.234:3000/userops/getUserOpByHashAWS', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            redirect: 'follow',
            referrerPolicy: 'no-referrer',
            body: JSON.stringify({
                userOpHash: userOpHash,
            })
        }).then((r) => r.json()).then((r) => { return r.data })
    }
    async _storeUserOpInternal(userOp, userOpHash, user) {
        await fetch('http://34.222.30.234:3000/userops/storeUserOpAWS', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            redirect: 'follow',
            referrerPolicy: 'no-referrer',
            body: JSON.stringify({
                userOpHash: userOpHash,
                userOp: userOp,
                user
            })
        })
    }

    /**
    * Deploys a wallet to chain that can initiate aave liquidation
    * @return {receipt, executionHash} 
    * receipt - receipt of transaction committed to chain.
    * executionHash - string hash of the UserOperation 
    */
    async deployWallet() {
        try {
            const receipt = await this._sendOpToBundler(this.createWalletOP)
            return { receipt, executionHash: this.actionExecutionOpHash }
        } catch {
            const { walletCreationOp, actionExecutionOpHash } = await this._createWalletInitData(this.walletType, this.params)
            const receipt = await this._sendOpToBundler(walletCreationOp)
            return { receipt, executionHash: actionExecutionOpHash }

        }
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
        const action = new ethers.Contract(address, ERCToken.abi, this.eoa)
        this.contracts[address] = new WrappedEthersContract(this.eoa, this.provider, this.chainId, action)
    }

    async getChainInfo(chain) {
        return await fetch('http://34.222.30.234:3000/chaininfo/getChainInfoAWS', {
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
    async getTokenApprovalTx(aTokenAddress, amount = MAX_INT) {
        this._initTokenContract(aTokenAddress)
        return await this.contracts[aTokenAddress].createSignedTransaction("approve", [this.address, amount])
    }

    async sendTransaction(tx) {
        const submittedTx = await this.provider.sendTransaction(tx);
        return await submittedTx.wait()
    }
}

module.exports = { FunWallet }

