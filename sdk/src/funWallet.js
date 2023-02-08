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

        // let chainInfo = await DataServer.getChainInfo(this.chain)
        // console.log(chainInfo)
        // const {
        //     rpcdata: { rpcurl, bundlerUrl},
        //     aaData: { entryPointAddress, factoryAddress },
        // } = chainInfo

        const bundlerUrl = "http://localhost:3000/rpc"
        const rpcurl = "http://127.0.0.1:8545/"

        const entryPointAddress = "0x75b0B516B47A27b1819D21B26203Abf314d42CCE"
        const verificationAddr = "0x906B067e392e2c5f9E4f101f36C0b8CdA4885EBf"
        const factoryAddress = "0xD94A92749C0bb33c4e4bA7980c6dAD0e3eFfb720"



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

