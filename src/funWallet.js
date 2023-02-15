const { ContractsHolder } = require("../utils/ContractsHolder")
const { DataServer } = require('../utils/DataServer')
const { generateSha256 } = require("../utils/Tools")
const UserOpUtils = require('../utils/UserOpUtils')
const EOATools = require('../utils/eoaUtils')

const { FunWalletConfig } = require("./FunWalletConfig")

class FunWallet extends ContractsHolder {

    transactions = {}  

    /**
    * Standard constructor
    * @params config, index, userId
    * - config: an instance of FunWalletConfig
    * - orgId: id of organization operating wallet
    * - apiKey: api key to access Fun Wallet service
    */
    constructor(config, orgId, apiKey) {
        this.rpcUrl = config.eoa.provider.connection.url
        this.provider = new ethers.providers.JsonRpcProvider(this.rpcurl);
        super(config.eoa, this.provider, config.chainId)
        
        this.config = new FunWalletConfig(config.eoa, config.chainId, config.prefundAmt, config.index)
        this.dataServer = new DataServer(orgId, apiKey);
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

        const {bundlerClient, funWalletDataProvider } = await this.config.getClients()
        this.bundlerClient = bundlerClient
        this.funWalletDataProvider = funWalletDataProvider

        this.address = await this.funWalletDataProvider.getAccountAddress()
        this.eoaAddr = await this.config.eoa.getAddress()

        const walletContract = await this.funWalletDataProvider.getAccountContract()
        this.addEthersContract(this.address, walletContract)

        // Pre-fund FunWallet
        if (this.config.prefundAmt) {
            return await EOATools.fundAccount(this.config.eoa, this.address, this.config.prefundAmt)
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
        let txData = { ...initTx, salt }
        this.transactions[generateSha256(txData)] = txData;
        module.innerAddData(this)
        module.init()
        return txData
    }

    /**
     * 
     * @returns 
     */
    async deploy() {
        await this.init()
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

        const createWalleteData = await this.contracts[this.address].getMethodEncoding("execBatchInit", [actionCreateData.dests, actionCreateData.values, actionCreateData.data])

        const op = await UserOpUtils.createUserOp(this.funWalletDataProvider, createWalleteData, 0, false, true)
        const receipt = await UserOpUtils.deployUserOp({ data: { op } }, this.bundlerClient, this.funWalletDataProvider)

        await this.dataServer.storeUserOp(op, 'deploy_wallet', totalBalance)

        return { receipt, address: this.address }
    }

    /**
     * deploy a single transaction. only work after deploy fun wallet
     * @param {*} transaction 
     * @returns single receipt of a transaction
     */
    async deployTx(transaction) {
        if (transaction.isUserOp) {
            return await UserOpUtils.deployUserOp(transaction, this.bundlerClient, this.funWalletDataProvider)
        }
        else {
            const tx = await this.eoa.sendTransaction(transaction.data)
            return await tx.wait()
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
}

module.exports = { FunWallet }