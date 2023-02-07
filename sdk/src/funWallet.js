const fetch = require("node-fetch")
const { generateSha256 } = require("../utils/tools")
const { ContractsHolder } = require("../utils/ContractsHolder")

const { HttpRpcClient } = require('@account-abstraction/sdk')
const ethers = require('ethers')

const Action = require("../utils/abis/Action.json")
const ERCToken = require('../utils/abis/ERC20.json');


const BundlerTools = require('../utils/actionUtils')
const EOATools = require('../utils/eoaUtils')
const { TranslationServer } = require('../utils/TranslationServer')
const { BundlerInstance } = require("../utils/BundlerInstance")
const Tools = require('../utils/tools')
const { Transaction } = require("../utils/Transaction")
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

    actionsStore = {}

    constructor(config, index = 0, userId = "fun") {
        super()
        this.addVarsToAttributes({ ...config, index })
        this.translationServer = new TranslationServer(config.apiKey, userId)

    }

    async addModule(module, salt = 0) {
        let action = await module.create()
        let data = { ...action, salt }
        this.actionsStore[generateSha256(data)] = data;
        module.innerAddData(this)
        return data
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

        // let chainInfo = await TranslationServer.getChainInfo(this.chain)
        // const {
        //     rpcdata: { rpcurl },
        //     aaData: { entryPointAddress, factoryAddress },
        // } = chainInfo

        const bundlerUrl = "http://localhost:3000/rpc"
        const rpcurl = "http://127.0.0.1:8545/"

        const entryPointAddress = "0x15Ff10fCc8A1a50bFbE07847A22664801eA79E0f"

        const verificationAddr = "0x26291175Fa0Ea3C8583fEdEB56805eA68289b105"
        const factoryAddress = "0x840748F7Fd3EA956E5f4c88001da5CC1ABCBc038"







        const { bundlerClient, provider, accountApi } = await BundlerInstance.connect(rpcurl, bundlerUrl, entryPointAddress, factoryAddress, verificationAddr, this.eoa, this.index)

        this.bundlerClient = bundlerClient
        this.provider = provider
        this.accountApi = accountApi

        this.address = await this.accountApi.getAccountAddress()
        this.eoaAddr = await this.eoa.getAddress()

        const walletContract = await this.accountApi.getAccountContract()

        this.addEthersContract(this.address, walletContract)

        if (this.prefundAmt) {
            return await EOATools.fundAccount(this.eoa, this.address, this.prefundAmt)
        }
    }

    async _createWalletInitData({ type, params }) {
        switch (type) {
            case "AAVE": {
                return await this._createAAVEWithdrawal(params)
            }
            default: {
                return { actionInitData: {}, balance: 0 }
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

    async createModuleExecutionTx(action) {
        return this._createAAVEWithdrawalExec(action)
    }

    async createAction({ to, data }) {
        const op = await this.accountApi.createSignedUserOp({ target: to, data, noInit: true, calldata: false })
        return new Transaction({ op }, true)
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
        const actionCreateData = { dests: [], values: [], data: [] }
        let balance = Object.values(this.actionsStore).map((actionData) => {
            if (actionData.to) {
                const { to, value, data } = actionData
                actionCreateData.dests.push(to)
                actionCreateData.values.push(value ? value : 0)
                actionCreateData.data.push(data)
            }
            if (actionData.balance) return actionData.balance;
        })

        const createWalleteData = await this.contracts[this.address].getMethodEncoding("execBatchInit", [actionCreateData.dests, actionCreateData.values, actionCreateData.data])
        const op = await BundlerTools.createAction(this.accountApi, createWalleteData, 560000, false, true)
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
            return await this.deployActionTx(transaction, this.apiKey)
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

