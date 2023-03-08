const { ContractsHolder } = require("../utils/ContractsHolder")
const { DataServer } = require('../utils/DataServer')
const { generateSha256 } = require("../utils/Tools")
const UserOpUtils = require('../utils/UserOpUtils')
const EoaUtils = require('../utils/EoaUtils')
const { ethers } = require('ethers');

const { FunWalletConfig } = require("./FunWalletConfig")
const { BADHINTS } = require("dns")
const { arrayBuffer } = require("stream/consumers")

const { objDiffMapper } = require("../utils/FunWalletUtils")

class FunWallet extends ContractsHolder {

        transactions = {}
        dupes = new Map()
        batch = []
        chainState = {}
        localState = {}
        modules = {}
        /**
        * Standard constructor
        * @params config, apiKey
        * - config: an instance of FunWalletConfig
        * - apiKey: api key to access Fun Wallet service
        */
        constructor(config, API_KEY) {

            if (!(config instanceof FunWalletConfig)) {
                throw Error("Config Must be of type FunWalletConfig or child classes")
            }

            super(config.eoa, config.eoa.provider, config.chainId)
            this.config = config
            this.dataServer = new DataServer(API_KEY);
        }

        static async retrieve(API_KEY, auth, chainName, userId = 0, index = 0) {
            const walletConfig = new FunWalletConfig(auth.eoa, chainName, 0, userId, null, index)  //TODO: refractor to make similar to auth
            const wallet = new FunWallet(walletConfig, API_KEY)
            await wallet.init()
            //call data server to get modules
            const dataServer = new DataServer(API_KEY)
            await dataServer.init()

            const currentState = this.dataServer.getAccountState(userId);
            currentState.chains.map((chain) => {
                chain.wallet.map((wallets) => {
                    wallets.users.roles.map((role_hash) => {
                        //do logic
                    })
                    wallets.roles.map((role) => {
                        role.modules((module) => {
                            module.constraints.map((constraint) => {
                                //do logic
                            })
                            //logic
                            wallet.addModule()
                        })
                    })

                })
            })
            wallet.retrieve
            return wallet
        }

        async compressTxs(action) {
            //transactions is a list of transactions, in order 
            let identifiers = ""
            action.identifiers.map((identifier) => {
                identifiers += "." + identifier
            })
            let hash = `${action.type}${identifiers}`
            const params = action.data

            //add or remove user
            //whitelist or blacklist user

            //item can be canceled
            if (this.dupes.has(hash)) {
                const idx = this.batch.map((storedAction) => {
                    storedAction.id
                }).indexOf(hash)
                this.batch.splice(idx, 1)
                this.dupes.delete(hash)
            }
            else {
                this.dupes.set(hash, params)
                action.id = hash
                batch.push(action)
            }
        }
        
        async getLocalVsChainState() {
            return objDiffMapper(chainState, localState)
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

            this.eoaAddr = await this.config.eoa.getAddress()
            this.config.userId = (this.config.userId ? this.config.userId : this.eoaAddr) + this.config.index.toString()

            const { bundlerClient, funWalletDataProvider } = await this.config.getClients()
            this.bundlerClient = bundlerClient
            this.funWalletDataProvider = funWalletDataProvider

            this.address = await this.funWalletDataProvider.getAccountAddress()

            const walletContract = await this.funWalletDataProvider.getAccountContract()
            this.addEthersContract(this.address, walletContract)

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
        * 
        * @returns data, to, salt
        */
        async addModule(module, salt = 0) {
            await module.init(this.config.chainId)
            let initTx = await module.encodeInitCall()
            let txData = { ...initTx, salt }
            this.transactions[generateSha256(txData)] = txData;
            module.innerAddData(this)
            this.modules[module]
            return txData
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

            const createWalleteData = await this.contracts[this.address].getMethodEncoding("execBatchInit", [actionCreateData.dests, actionCreateData.values, actionCreateData.data])

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
            const { funWalletDataProvider } = await this.config.getClients()
            this.funWalletDataProvider = funWalletDataProvider
        }
    }

module.exports = { FunWallet }
