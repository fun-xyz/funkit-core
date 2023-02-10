const { OnChainResources } = require("../utils/OnChainResources")
const { ContractsHolder } = require("../utils/ContractsHolder")
const { DataServer } = require('../utils/DataServer')

const { generateSha256 } = require("../utils/tools")

const UserOpUtils = require('../utils/UserOpUtils')
const EOATools = require('../utils/eoaUtils')

const FACTORY_ADDRESS = "0xDfc25b0Fc4E026e69cE53F547C344D3b5f1d3A79"
const VERIFICATION_ADDR = "0x7F4d8Db0870aBf71430656234Ca7B859757e0876"

class FunWallet extends ContractsHolder {

    transactions = {}

    /**
    * Standard constructor
    * @params config, index, userId
    * - config: FunWalletConfig (see /utils/configs/walletConfigs)
    * - index: index of account (default 0)
    * - userId: id of organization operating wallet
    */
    constructor(config, index = 0, userId = "fun") {
        super()
        this.parseConfig({ ...config, index })
        this.dataServer = new DataServer(config.apiKey, userId);
    }

    /**
     * Parses the following parameters: eoa, prefundAmt, chain, apiKey, userId, index
     * and adds them to the classes internal variable memory
     */
    parseConfig(vars) {
        Object.keys(vars).forEach(varKey => {
            this[varKey] = vars[varKey]
        })
    }

    /**
     * @returns
     */
    getAccountApi() {
        return this.accountApi
    }

    /**
     * @returns DataServer object
     */
    getDataServer() {
        return this.dataServer
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

        let chainInfo = await DataServer.getChainInfo(this.chain)
        const {
            rpcdata: { rpcurl, bundlerUrl},
            // aaData: { entryPointAddress },
       
        } = chainInfo

        const { bundlerClient, provider, accountApi } = await OnChainResources.connect(rpcurl, bundlerUrl, entryPointAddress, FACTORY_ADDRESS, VERIFICATION_ADDR, this.eoa, this.index)

        this.bundlerClient = bundlerClient
        this.provider = provider
        this.accountApi = accountApi

        this.address = await this.accountApi.getAccountAddress()
        this.eoaAddr = await this.eoa.getAddress()

        const walletContract = await this.accountApi.getAccountContract()

        this.addEthersContract(this.address, walletContract)

        // Pre-fund FunWallet
        if (this.prefundAmt) {
            return await EOATools.fundAccount(this.eoa, this.address, this.prefundAmt)
        }
    }

    /**
    * Generates a Module.init transaction call ready to be signed
    * 
    * @params
    * - module: Module to add to the FunWallet
    * - salt: salt
    * 
    * @returns data, to, salt
    */
    async addModule(module, salt = 0) {
        let initTx = await module.encodeInitCall()
        // data = data, to, salt
        let txData = { ...initTx, salt }
        this.transactions[generateSha256(txData)] = txData;
        module.innerAddData(this)
        return txData
    }

    /**
     * 
     * @returns 
     */
    async deploy() {

        await this.init()
        const actionCreateData = { dests: [], values: [], data: [] }

        let balance = Object.values(this.transactions).map((actionData) => {
            const { to, value, data, balance } = actionData
            if (to) {
                actionCreateData.dests.push(to)
                actionCreateData.values.push(value ? value : 0)
                actionCreateData.data.push(data)
            }
            if (balance) return balance;
        })

        const createWalleteData = await this.contracts[this.address].getMethodEncoding("execBatchInit", [actionCreateData.dests, actionCreateData.values, actionCreateData.data])

        const op = await UserOpUtils.createUserOp(this.accountApi, createWalleteData, 560000, false, true)
        const receipt = await UserOpUtils.deployUserOp({ data: { op } }, this.bundlerClient, this.accountApi)

        await this.dataServer.storeUserOp(op, 'deploy_wallet', balance)

        return { receipt, address: this.address }
    }

    /**
     * 
     * @param {*} transaction 
     * @returns 
     */
    async deployTx(transaction) {
        if (transaction.isUserOp) {
            return await UserOpUtils.deployUserOp(transaction, this.bundlerClient, this.accountApi)
        }
        else {
            // transaction.data.user = this.dataServer.user,
            //     transaction.data.chain = this.chain
            const tx = await this.eoa.sendTransaction(transaction.data)
            return await tx.wait()
        }
    }

    /**
     * 
     * @param {*} txs 
     * @returns 
     */
    async deployTxs(txs) {
        const receipts = []
        for (let transaction of txs) {
            receipts.push(await this.deployTx(transaction))
        }
        return receipts
    }

    /**
     * 
     * @param {*} transaction 
     * @param {*} apikey 
     * @param {*} eoa 
     * @returns 
     */
    static async deployTx(transaction, apikey = "", eoa = false) {
        if (transaction.isUserOp) {
            return await UserOpUtils.deployUserOperation(transaction, apiKey = apikey)
        }
        if (!eoa) {

        }
        return await eoa.sendTransaction(transaction.data)

    }

    /**
     * 
     * @param {*} txs 
     * @returns 
     */
    static async deployTxs(txs) {
        const receipts = []
        for (let transaction of txs) {
            receipts.push(await this.deployTx(transaction))
        }
        return receipts
    }

}

module.exports = { FunWallet }