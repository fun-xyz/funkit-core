const fetch = require("node-fetch")
const { wrapProvider } = require("../utils/Provider")
const { TreasuryAPI } = require("../utils/TreasuryAPI")
const { generateSha256 } = require("../utils/tools")
const { ContractsHolder } = require("../utils/ContractsHolder")

const { HttpRpcClient } = require('@account-abstraction/sdk')
const ethers = require('ethers')

const Action = require("../utils/abis/Action.json")
const ERCToken = require('../utils/abis/ERC20.json');
const Treasury = require("../utils/abis/Treasury.json")

const BundlerTools = require('../utils/actionUtils')
const EOATools = require('../utils/eoaUtils')
const TranslationServer = require('../utils/TranslationServer')

const abi = ethers.utils.defaultAbiCoder;
const MAX_INT = "0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"

class FunWallet extends ContractsHolder {
    /**
    * Standard constructor
    * @params eoa, preFundAmt, index
    * eoa - ethers.Wallet object
    * preFundAmt - amount to prefund the wallet with, in eth/avax
    * index - index of account (default 0)
    */


    constructor(config, index = 0) {
        super()
        this.eoa = config.eoa
        this.prefundAmt = config.prefundAmt
        this.schema = config.schema
        this.actionsStore = config.schema.actionsStore
        this.index = index
        this.chain = config.chain
        this.apiKey = config.apiKey
    }

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
        let chainInfo = await TranslationServer.getChainInfo(this.chain)

        this.bundlerUrl = chainInfo.rpcdata.bundlerUrl
        this.rpcurl = chainInfo.rpcdata.rpcurl
        this.entryPointAddress = chainInfo.aaData.entryPointAddress
        this.factoryAddress = chainInfo.aaData.factoryAddress
        this.AaveWithdrawalAddress = chainInfo.actionData.aave

        this.AaveSupplyAddress = chainInfo.actionData.aaveSupply


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
        this.eoaAddr = await this.eoa.getAddress()

        this.addContract(this.address, Treasury.abi)

        if (prefundAmt) {
            return await EOATools.fundAccount(this.eoa, this.address, amt)
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
        let balance = await Promise.all(Object.values(this.actionsStore).map(async (actionData) => {
            const { actionInitData, balance } = await this._createWalletInitData(actionData)
            const { to, data } = actionInitData
            actionCreateData.to.push(to)
            actionCreateData.data.push(data)
            return balance
        }))

        const createWalleteData = await this.contracts[this.address].getMethodEncoding("execBatch", [actionCreateData.to, actionCreateData.data])
        console.log(createWalleteData)
        const op = await BundlerTools._createAction(this.accountApi, createWalleteData, 560000)
        console.log(op)
        const receipt = await this.deployActionTx(op)
        await TranslationServer._storeUserOp(op, 'deploy_wallet', balance, this.apiKey)
        return receipt
    }

    async deployActionTx(op) {
        const userOpHash = await this.rpcClient.sendUserOpToBundler(op)
        const txid = await this.accountApi.getUserOpReceipt(userOpHash)

        return { userOpHash, txid }
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
        this.addContract(this.AaveWithdrawalAddress, Action.abi)
        this.addContract(tokenAddr, ERCToken.abi)
        const input = [this.eoaAddr, tokenAddr]
        const key = generateSha256(input)
        const aaveData = abi.encode(["address", "address", "string"], [...input, key]);
        const actionInitData = await this.contracts[this.AaveWithdrawalAddress].getMethodEncoding("init", [aaveData])
        const balance = await this.contracts[tokenAddr].callMethod("balanceOf", [this.eoaAddr])
        return { actionInitData, balance }
    }



    async createActionTx(action) {
        return this._createAAVEWithdrawalExec(action)
    }
    async _createAAVEWithdrawalExec({ params }) {
        this.params = params
        const tokenAddr = this.params[0]
        this.addContract(this.AaveWithdrawalAddress, Action.abi)
        const input = [this.eoaAddr, tokenAddr]
        const key = generateSha256(input)
        const aaveexec = abi.encode(["string"], [key])
        const actionExec = await this.contracts[this.AaveWithdrawalAddress].getMethodEncoding("execute", [aaveexec])
        const actionExecutionOp = await BundlerTools._createAction(this.accountApi, actionExec, 500000, true)


        await TranslationServer._storeUserOp(actionExecutionOp, 'create_action', 0, this.apiKey)

        return actionExecutionOp
    }




    /**
    * Grants approval to controller wallet to liquidate funds
    * @return {receipt} 
    * receipt - TransactionReceipt of the approval confirmed on chain
    */

    async deployTokenApproval(aTokenAddress, amount = MAX_INT) {
        this.addContract(aTokenAddress, ERCToken.abi)
        const ethTx = await this.contracts[aTokenAddress].createUnsignedTransaction("approve", [this.address, amount])
        const submittedTx = await this.eoa.sendTransaction(ethTx);
        const receipt = await submittedTx.wait()

        await TranslationServer.storeEVMCall(receipt, 'fun', this.apiKey)

        return receipt
    }


    /**
    * Liquidates one's aave position
    * @params opHash - execution hash from deploying the wallet
    * @return {receipt, executionHash} 
    * userOpHash - string hash of the UserOperation 
    * txid - transaction id of transfer of assets
    */
    static async deployActionTx(op, apikey, chain = "43113") {
        let chainInfo = await TranslationServer.getChainInfo(chain)
        const bundlerUrl = chainInfo.rpcdata.bundlerUrl
        const rpcurl = chainInfo.rpcdata.rpcurl
        const entryPointAddress = chainInfo.aaData.entryPointAddress
        const factoryAddress = chainInfo.aaData.factoryAddress
        const AaveWithdrawalAddress = chainInfo.actionData.aave

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
        await TranslationServer._storeUserOp(op, 'deploy_action', 0, apikey)

        return { userOpHash, txid }
    }

    
}

module.exports = { FunWallet }

