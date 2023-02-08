const fetch = require("node-fetch")
const { generateSha256 } = require("../utils/tools")
const { ContractsHolder } = require("../utils/ContractsHolder")

const { HttpRpcClient } = require('@account-abstraction/sdk')
const ethers = require('ethers')

const Action = require("../utils/abis/Action.json")
const ERCToken = require('../utils/abis/ERC20.json');


const BundlerTools = require('../utils/actionUtils')
const EOATools = require('../utils/eoaUtils')
const { DataServer } = require('../utils/DataServer')
const { BundlerInstance } = require("../utils/BundlerInstance")
const Tools = require('../utils/tools')
const { Transaction } = require("../utils/Transaction")
const abi = ethers.utils.defaultAbiCoder;
// const MAX_INT = "0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
const MAX_INT = ethers.constants.MaxUint256._hex

class FunWallet extends ContractsHolder {

    actionsStore = {}
    /**
        * Standard constructor
        * @params config, index, userId
        * config - FunWalletConfig (see /utils/configs/walletConfigs
        * index - index of account (default 0)
        * userId - id of organization operating wallet
        * 
    */

    constructor(config, index = 0, userId = "fun") {
        super()
        this.addVarsToAttributes({ ...config, index })
        this.dataServer = new DataServer(config.apiKey, userId)
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

        const entryPointAddress = "0xAe9Ed85dE2670e3112590a2BB17b7283ddF44d9c"

        const verificationAddr = "0x73C68f1f41e4890D06Ba3e71b9E9DfA555f1fb46"
        const factoryAddress = "0xD2D5e508C82EFc205cAFA4Ad969a4395Babce026"


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




    async createAction({ to, data }) {
        const op = await this.accountApi.createSignedUserOp({ target: to, data, noInit: true, calldata: false })
        return new Transaction({ op }, true)
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
            const { to, value, data, balance } = actionData
            if (to) {
                actionCreateData.dests.push(to)
                actionCreateData.values.push(value ? value : 0)
                actionCreateData.data.push(data)
            }
            if (balance) return balance;
        })

        const createWalleteData = await this.contracts[this.address].getMethodEncoding("execBatchInit", [actionCreateData.dests, actionCreateData.values, actionCreateData.data])
        const op = await BundlerTools.createAction(this.accountApi, createWalleteData, 560000, false, true)
        const receipt = await this.deployActionTx({ data: { op } })
        await this.dataServer.storeUserOp(op, 'deploy_wallet', balance)
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
        const dataServer = new DataServer(apikey, user)
        let chainInfo = await DataServer.getChainInfo(chain)
        const {
            rpcdata: { bundlerUrl, rpcurl },
            aaData: { entryPointAddress, factoryAddress }
        } = chainInfo
        const { bundlerClient, accountApi } = await BundlerInstance.connectEmpty(rpcurl, bundlerUrl, entryPointAddress, factoryAddress)
        const userOpHash = await bundlerClient.sendUserOpToBundler(op)
        const txid = await accountApi.getUserOpReceipt(userOpHash)
        await dataServer.storeUserOp(op, 'deploy_action')
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

