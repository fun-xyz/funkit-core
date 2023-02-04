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
const { TranslationServer } = require('../utils/TranslationServer')
const { BundlerInstance } = require("../utils/BundlerInstance")
const Tools = require('../utils/tools')
const { Transaction } = require("../utils/Transaction")
const abi = ethers.utils.defaultAbiCoder;
// const MAX_INT = "0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
const MAX_INT= ethers.constants.MaxUint256._hex

class FunWallet extends ContractsHolder {
    /**
    * Standard constructor
    * @params eoa, preFundAmt, index
    * eoa - ethers.Wallet object
    * preFundAmt - amount to prefund the wallet with, in eth/avax
    * index - index of account (default 0)
    */

    actionsStore = {}

    constructor(config, index = 0, userId = "fun") {
        super()
        this.addVarsToAttributes({ ...config, index })
        this.translationServer = new TranslationServer(config.apiKey, userId)

        // this.actionsStore = config.schema.actionsStore
    }

    addModule(module,  salt = 0) {
        let action = module.create()
        this.actionsStore[generateSha256(action)] = { ...action, salt };
        return { ...action, salt }
    }

    addVarsToAttributes(vars) {
        Object.keys(vars).forEach(varKey => {
            this[varKey] = vars[varKey]
        })
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
        if (this.address) {
            return
        }
        let chainInfo = await TranslationServer.getChainInfo(this.chain)
        const {
            rpcdata: { bundlerUrl, rpcurl },
            aaData: { entryPointAddress, factoryAddress },
            actionData: {
                aave: AaveWithdrawalAddress,
                aaveSupply: AaveSupplyAddress,
            }
        } = chainInfo

        const { bundlerClient, provider, accountApi } = await BundlerInstance.connect(rpcurl, bundlerUrl, entryPointAddress, factoryAddress, this.eoa, this.index)

        this.addVarsToAttributes({
            AaveWithdrawalAddress,
            AaveSupplyAddress,
            bundlerClient,
            provider,
            accountApi,
        })

        this.address = await this.accountApi.getAccountAddress()
        this.eoaAddr = await this.eoa.getAddress()

        this.addContract(this.address, Treasury.abi)

        if (this.prefundAmt) {
            return await EOATools.fundAccount(this.eoa, this.address, this.prefundAmt)
        }
    }

    async _createWalletInitData({ type, params }) {
        switch (type) {
            case "AAVE": {
                return await this._createAAVEWithdrawal(params)
            }
          
        }
    }




    async _createAAVEWithdrawal(params) {
        const tokenAddr = params[0]
        this.addContract(this.AaveWithdrawalAddress, Action.abi)
        this.addContract(tokenAddr, ERCToken.abi)
        const input = [this.eoaAddr, tokenAddr]
        const key = generateSha256(input)
        const aaveData = abi.encode(["address", "address", "string"], [...input, key]);
        const actionInitData = await this.contracts[this.AaveWithdrawalAddress].getMethodEncoding("init", [aaveData])
        const balance = await this.contracts[tokenAddr].callMethod("balanceOf", [this.eoaAddr])
        return { actionInitData, balance }
    }

    async createModuleExecutionTx(action) {
        switch (action.type) {
            case "AAVE": {
                return await this._createAAVEWithdrawalExec(action)
            }
            case "TRANSFER": {
                return await this._createTokenTransferExect(action)
            }
        }
    }
    async _createTokenTransferExect({ params }) {

        const tokenAddr = params[2]
        this.addContract(tokenAddr, ERCToken.abi)
        const actionExec = await this.contracts[tokenAddr].getMethodEncoding("transfer", [params[0], params[1]])
        const actionExecutionOp = await BundlerTools.createAction(this.accountApi, actionExec, 500000, true)
        await this.translationServer.storeUserOp(actionExecutionOp, 'create_action')
        const data = {
            op: actionExecutionOp,
            user: this.translationServer.user,
            chain: this.chain
        }
        return new Transaction(data, true)
    }


    /**
      * Liquidates one's aave position
      * @params opHash - execution hash from deploying the wallet
      * @return {receipt, executionHash} 
      * userOpHash - string hash of the UserOperation 
      * txid - transaction id of transfer of assets
      */

    async _createAAVEWithdrawalExec({ params }) {
        this.addContract(this.AaveWithdrawalAddress, Action.abi)

        this.params = params
        const tokenAddr = this.params[0]
        const input = [this.eoaAddr, tokenAddr]
        const key = generateSha256(input)

        const aaveexec = abi.encode(["string"], [key])
        const actionExec = await this.contracts[this.AaveWithdrawalAddress].getMethodEncoding("execute", [aaveexec])
        const actionExecutionOp = await BundlerTools.createAction(this.accountApi, actionExec, 500000, true)

        await this.translationServer.storeUserOp(actionExecutionOp, 'create_action')

        const data = {
            op: actionExecutionOp,
            user: this.translationServer.user,
            chain: this.chain
        }
        return new Transaction(data, true)
    }


    // Deprecated for Module.getRequiredPreTxs()
    // async deployTokenApproval(aTokenAddress, amount) {
    // }

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
            if(actionData.noInit){
                return
            }
            console.log(actionData)
            const { actionInitData, balance } = await this._createWalletInitData(actionData)
            const { to, data } = actionInitData
            actionCreateData.to.push(to)
            actionCreateData.data.push(data)
            return balance
        }))

        const createWalleteData = await this.contracts[this.address].getMethodEncoding("execBatch", [actionCreateData.to, actionCreateData.data])
        const op = await BundlerTools.createAction(this.accountApi, createWalleteData, 560000)
        const receipt = await this.deployActionTx({ data: { op } })
        await this.translationServer.storeUserOp(op, 'deploy_wallet', balance)
        return { receipt, address: this.address }
    }

    async deployActionTx(transaction) {
        const { op } = transaction.data
        const userOpHash = await this.bundlerClient.sendUserOpToBundler(op)
        const txid = await this.accountApi.getUserOpReceipt(userOpHash)

        return { userOpHash, txid }
    }

    async deployTx(transaction) {
        if (transaction.isUserOp) {
            return await FunWallet.deployActionTx(transaction, this.apiKey)
        }
        else {
            const tx = await this.eoa.sendTransaction(transaction.data)
            return await tx.wait()
        }
    }

    async deployTxs(txs) {
        for (let transaction of txs) {
            console.log("receipt", await this.deployTx(transaction))
        }
    }

    // STATIC METHODS

    static async deployActionTx(transaction, apikey) {
        if (!apikey) {
            throw {};
            return
        }
        const { op, user, chain } = transaction.data
        const translationServer = new TranslationServer(apikey, user)
        let chainInfo = await TranslationServer.getChainInfo(chain)
        const {
            rpcdata: { bundlerUrl, rpcurl },
            aaData: { entryPointAddress, factoryAddress }
        } = chainInfo

        const { bundlerClient, accountApi } = await BundlerInstance.connectEmpty(rpcurl, bundlerUrl, entryPointAddress, factoryAddress)
        const userOpHash = await bundlerClient.sendUserOpToBundler(op)
        const txid = await accountApi.getUserOpReceipt(userOpHash)
        await translationServer.storeUserOp(op, 'deploy_action')
        return { userOpHash, txid }
    }

    static async deployTx(transaction, apikey = "", eoa = false) {
        if (transaction.isUserOp) {
            return await FunWallet.deployActionTx(transaction, apikey)
        }

        if (!eoa) {
        }
        return await eoa.sendTransaction(transaction.data)

    }

    static async deployTxs(txs) {
        for (let transaction of txs) {
            console.log("receipt", await this.deployTx(transaction))
        }
    }

}

module.exports = { FunWallet }

