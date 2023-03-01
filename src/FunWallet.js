const { DataServer } = require('../utils/DataServer')
const { generateSha256 } = require("../utils/Tools")
const UserOpUtils = require('../utils/UserOpUtils')
const EoaUtils = require('../utils/EoaUtils')
const { FunWalletConfig } = require("./FunWalletConfig")
const { USER_MANAGEMENT_MODULE_NAME, ROLE_MANAGEMENT_MODULE_NAME, TOKEN_TRANSFER_MODULE_NAME } = require("./modules/Module")
const { ModuleManager } = require("../utils/ModuleManager")
const { WrappedEthersContract } = require("../utils/WrappedEthersContract")

class FunWallet extends ModuleManager {

    transactions = {}
    modules = {}

    /**
    * Standard constructor
    * @params config, apiKey
    * - config: an instance of FunWalletConfig
    * - apiKey: api key to access Fun Wallet service
    */
    constructor(config, apiKey) {

        if (!(config instanceof FunWalletConfig)) {
            throw Error("Config Must be of type FunWalletConfig or child classes")
        }

        super(config.chainId)
        this.eoa = config.eoa
        this.chainId = config.chainId
        this.provider = config.eoa.provider
        this.config = config
        this.dataServer = new DataServer(apiKey)
    }

    /**     
     * Runs initialization for a given wallet.
     * The function acts as a constructor for many parameters in the class, creating
     * an abstracted wallet account, with the correct providers and rpc client. 
     * It also prefunds the account with the amount of eth/avax desired.
     */
    async init() {

        // Only init once
        if (this.address) {
            return
        }

        this.dataServer.init()

        this.ownerAddr = this.config.ownerAddr

        const { bundlerClient, funWalletDataProvider } = await this.config.getClients()
        this.bundlerClient = bundlerClient
        this.funWalletDataProvider = funWalletDataProvider

        const walletContract = await this.funWalletDataProvider.getAccountContract()
        this.address = await this.funWalletDataProvider.getAccountAddress()
        this.contract = new WrappedEthersContract(this.config.eoa, this.provider, this.chainId, walletContract)

        // Pre-fund FunWallet
        if (this.config.prefundAmt) {
            return await EoaUtils.fundAccount(this.config.eoa, this.address, this.config.prefundAmt)
        }
    }

    /**
    * Generates a Module.init transaction call ready to be signed
    * 
    * @params
    * - module: Module to add to the FunWallet
    * - salt: salt
    */
    async addModule(module, salt = 0) {
        await super.addModule(module)
        let initTx = await module.encodeInitCall()
        let txData = { ...initTx, salt }
        this.transactions[generateSha256(txData)] = txData
        module.innerAddData(this)
    }

    /**
     * deploy the fun wallet
     * @returns receipt of the wallet deployment transaction and the fun wallet contract address
     */
    async deploy() {
        const actionCreateData = { dests: [], values: [], data: [] }

        let totalBalance = 0
        Object.values(this.transactions).map((actionData) => {
            const { to, value, data, balance } = actionData
            if (to) {
                actionCreateData.dests.push(to)
                actionCreateData.values.push(value ? value : 0)
                actionCreateData.data.push(data)
            }
            totalBalance += balance
        })

        const createWalleteData = await this.contract.getMethodEncoding("execBatchInit", [actionCreateData.dests, actionCreateData.values, actionCreateData.data])

        const op = await UserOpUtils.createUserOp(this.funWalletDataProvider, createWalleteData, 0, false, true)
        const deployReceipt = await UserOpUtils.deployUserOp({ data: { op } }, this.bundlerClient, this.funWalletDataProvider, this.provider)
        const gas = await UserOpUtils.gasCalculation(deployReceipt, this.provider, this.config.chainCurrency)
        const receipt = { ...gas, deployReceipt }
        op.chain = this.chainId
        await this.dataServer.storeUserOp({ op, type: 'deploy_wallet', balance: totalBalance, receipt })

        return { receipt, address: this.address }
    }

    /**
     * deploy a single transaction. only work after deploy fun wallet
     * @param {*} transaction is an instance of Transaction /utils/Transaction.js
     * @returns single receipt of a transaction
     */
    async deployTx(transaction) {
        if (transaction.isUserOp) {
            const deployReceipt = await UserOpUtils.deployUserOp(transaction, this.bundlerClient, this.funWalletDataProvider)
            const gas = await UserOpUtils.gasCalculation(deployReceipt, this.provider, this.config.chainCurrency)
            const receipt = { ...deployReceipt, ...gas }
            const { op } = transaction.data
            op.chain = this.chainId
            await this.dataServer.storeUserOp({ op, type: 'deploy_transaction', receipt })
            return receipt
        }
        else {
            const tx = await this.eoa.sendTransaction(transaction.data)
            const receipt = await tx.wait()
            receipt.chain = this.chain
            this.dataServer.storeEVMCall(receipt)
            return receipt
        }
    }

    /**
     * deploy transactions. only work after deploy fun wallet
     * @param {*} txs 
     * @returns receipts of transactions
     */
    async deployTxs(txs) {
        const receipts = []
        for (let transaction of txs) {
            receipts.push(await this.deployTx(transaction))
        }
        return receipts
    }

    async updatePaymaster(paymaster) {
        if (paymaster && !(paymaster instanceof BasePaymaster)) {
            throw new Error("Paymaster must be of type BasePaymaster or children")
        }

        this.config.paymaster = paymaster
        const {  funWalletDataProvider } = await this.config.getClients()
        this.funWalletDataProvider = funWalletDataProvider
    }

    /* Primitive module can be called directly from FunWallet instance
    */

    // TokenTransfer
    async createTransferTx(to, amount, ERC20Token) {
        return await this.modules[TOKEN_TRANSFER_MODULE_NAME].createTransferTx(to, amount, ERC20Token)
    }

    // User Manager
    async createUserTx(userId, userMetadata) {
        return await this.modules[USER_MANAGEMENT_MODULE_NAME].createUserTx(userId, userMetadata)
    }

    async deleteUserTx(userId) {
        return await this.modules[USER_MANAGEMENT_MODULE_NAME].deleteUserTx(userId)
    }

    async updateUserTx(userId, userMetadata) {
        return await this.modules[USER_MANAGEMENT_MODULE_NAME].updateUserTx(userId, userMetadata)
    }

    async getUser(userId) {
        return await this.modules[USER_MANAGEMENT_MODULE_NAME].getUser(userId)
    }

    // Role Manager
    async createRoleTx(roleName, moduleAddr, rules) {
        return await this.modules[ROLE_MANAGEMENT_MODULE_NAME].createRoleTx(roleName, moduleAddr, rules)
    }

    async attachRuleToRoleTx(roleName, moduleAddr, rule) {
        return await this.modules[ROLE_MANAGEMENT_MODULE_NAME].attachRuleToRoleTx(roleName, moduleAddr, rule)
    }

    async removeRuleFromRoleTx(roleName, moduleAddr, rule) {
        return await this.modules[ROLE_MANAGEMENT_MODULE_NAME].removeRuleFromRoleTx(roleName, moduleAddr, rule)
    }

    async getRulesOfRole(roleName, moduleAddr) {
        return await this.modules[ROLE_MANAGEMENT_MODULE_NAME].getRulesOfRole(roleName, moduleAddr)
    }
}

module.exports = { FunWallet }