const { OnChainResources } = require("../utils/OnChainResources")
const { ContractsHolder } = require("../utils/ContractsHolder")
const { DataServer } = require('../utils/DataServer')
const { generateSha256 } = require("../utils/tools")
const UserOpUtils = require('../utils/UserOpUtils')
const EOATools = require('../utils/eoaUtils')


// FORK ADDRESSES
const FACTORY_ADDRESS = require("../test/contractConfig.json").factoryAddress
const VERIFICATION_ADDR = require("../test/contractConfig.json").verificationAddress

const bundlerUrl = "http://localhost:3000/rpc"

const { USDCPaymaster } = require("./paymasters/USDCPaymaster")

class FunWalletConfig {
    constructor(eoa, chain, apiKey, prefundAmt, paymasterAddr, orgId, index = 0) {
        this.eoa = eoa
        this.chain = chain
        this.apiKey = apiKey
        this.prefundAmt = prefundAmt
        this.paymasterAddr = paymasterAddr
        this.orgId = orgId
        this.index = index
    }
}

class FunWallet extends ContractsHolder {

    transactions = {}

    /**
    * Standard constructor
    * @params config, index, userId
    * - config: FunWalletConfig (see /utils/configs/walletConfigs)
    * - index: index of account (default 0). update this when trying to operate on different fun wallets
    * - orgId: id of organization operating wallet
    */
    constructor(config, index = 0, orgId) {
        super()
        this.parseConfig({ ...config, index })
        this.dataServer = new DataServer(config.apiKey, orgId);
        if (config.paymasterAddr) {
            this.paymaster = new USDCPaymaster(config.paymasterAddr)
        }
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

        // let chainInfo = await DataServer.getChainInfo(this.chain)
        // const {
        //     rpcdata: { rpcurl, bundlerUrl },
        //     // aaData: { entryPointAddress },
        // } = chainInfo

        const rpcurl = this.eoa.provider.connection.url
        const entryPointAddress = require("../test/contractConfig.json").entryPointAddress
        const { bundlerClient, provider, accountApi } = await OnChainResources.connect(rpcurl, bundlerUrl, entryPointAddress, FACTORY_ADDRESS, VERIFICATION_ADDR, this.paymaster, this.eoa, this.index)

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
        if (!actionCreateData.dests.length) {
            return
        }
        const createWalleteData = await this.contracts[this.address].getMethodEncoding("execBatchInit", [actionCreateData.dests, actionCreateData.values, actionCreateData.data])

        const op = await UserOpUtils.createUserOp(this.accountApi, createWalleteData, 500000, false, true)

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

module.exports = { FunWallet, FunWalletConfig }