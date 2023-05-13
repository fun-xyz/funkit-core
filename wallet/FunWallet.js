const { DataServer } = require("../servers")
const { FirstClassActions, genCall } = require("../actions")
const { ParameterFormatError, Helper } = require("../errors")
const { UserOp, WalletIdentifier, Token } = require("../data")
const { TokenSponsor, GaslessSponsor } = require("../sponsors")
const { WalletAbiManager, WalletOnChainManager } = require("../managers")
const { verifyFunctionParams, validateClassInstance, parseOptions, gasCalculation, getChainFromData, getUniqueId } = require("../utils")
const { BigNumber, constants } = require("ethers")

const wallet = require("../abis/FunWallet.json")
const factory = require("../abis/FunWalletFactory.json")

const executeExpectedKeys = ["chain", "apiKey"]

class FunWallet extends FirstClassActions {
    objCache = {}

    /**
     * Creates FunWallet object
     * @constructor
     * @param {object} params - The parameters for the WalletIdentifier - uniqueId, index
     */
    constructor(params) {
        super()
        this.estimateGas.parent = this
        this.identifier = new WalletIdentifier(params)
        this.abiManager = new WalletAbiManager(wallet.abi, factory.abi)
        this.dataServer = new DataServer()
    }

    /**
     * Gets cached class instances
     * @param {Class} obj Class object stored in cache
     * @returns
     */
    async _getFromCache(obj) {
        const storekey = `${obj.constructor.name}:${obj[obj.key]}`
        if (!this.objCache[storekey]) {
            await obj.init()
            this.objCache[storekey] = obj
        }
        return this.objCache[storekey]
    }

    /**
     * Generates UserOp object for a transaction
     * @param {Auth} auth Auth class instance that signs the transaction
     * @param {function} transactionFunc Function that returns the data to be used in the transaction
     * @param {Object} txOptions Options for the transaction
     * @returns {UserOp}
     */
    async _generatePartialUserOp(auth, transactionFunc, txOptions = global) {
        const options = await parseOptions(txOptions, "Wallet.execute")
        const chain = await this._getFromCache(options.chain)
        const actionData = {
            wallet: this,
            chain,
            options
        }
        const { data, errorData, optionalParams } = await transactionFunc(actionData)
        {
            const { chain, apiKey } = options
            verifyFunctionParams(errorData.location, { chain, apiKey }, executeExpectedKeys)
        }

        const onChainDataManager = new WalletOnChainManager(chain, this.identifier)

        const sender = await this.getAddress({ chain })
        const callData = await this._getCallData(onChainDataManager, data, sender, auth, options)
        const { maxFeePerGas, maxPriorityFeePerGas } = await chain.getFeeData()

        const initCode = (await onChainDataManager.addressIsContract(sender)) ? "0x" : (await this._getThisInitCode(chain, auth))
        let paymasterAndData = "0x"
        if (options.gasSponsor) {
            let sponsor
            // gas payment method check
            switch (options.gasSponsor.token) {
                case "gasless":
            }
            if (options.gasSponsor.token) {
                sponsor = new TokenSponsor(options)
            } else {
                sponsor = new GaslessSponsor(options)

            }
            paymasterAndData = (await sponsor.getPaymasterAndData(options)).toLowerCase()
        }

        let partialOp = { callData, paymasterAndData, sender, maxFeePerGas, maxPriorityFeePerGas, initCode, ...optionalParams }
        const nonce = await auth.getNonce(partialOp)
        return { ...partialOp, nonce }
    }

    async _getCallData(onChainDataManager, data, sender, auth, options) {
        let tempCallData;
        let fee = { ...options.fee }
        if (options.fee) {
            if (!(fee.token || options.gasSponsor.token)) {
                const helper = new Helper("Fee", fee, "fee.token or gasSponsor.token is required")
                throw new ParameterFormatError("Wallet.execute", helper)
            }
            if (!fee.token && options.gasSponsor.token) {
                fee.token = options.gasSponsor.token
            }

            const token = new Token(fee.token)
            if (token.isNative) {
                fee.token = constants.AddressZero
            }
            else {
                fee.token = await token.getAddress()
            }

            if (fee.amount) {
                fee.amount = (await token.getDecimalAmount(fee.amount)).toString()
            } else if (fee.gasPercent) {
                const emptyFunc = async () => {
                    return {
                        data, errorData: { location: "Wallet.execute" }
                    }
                }
                const actualGas = await this.estimateGas(auth, emptyFunc, { ...options, fee: false })
                let eth = actualGas.getMaxTxCost()

                let percentNum = fee.gasPercent
                let percentBase = 100;
                while (percentNum % 1 != 0) {
                    percentNum *= 10
                    percentBase *= 10
                }

                if (!token.isNative) {
                    const ethTokenPairing = await onChainDataManager.getEthTokenPairing(fee.token)
                    const decimals = await token.getDecimals()
                    const numerator = BigNumber.from(10).pow(decimals);
                    const denominator = BigNumber.from(10).pow(18); // eth decimals
                    const price = ethTokenPairing.mul(numerator).div(denominator);
                    eth = price.mul(numerator).div(eth).mul(percentNum).div(percentBase)
                }

                fee.amount = eth
            } else {
                const helper = new Helper("Fee", fee, "fee.amount or fee.gasPercent is required")
                throw new ParameterFormatError("Wallet.execute", helper)
            }
            fee.oracle = await onChainDataManager.chain.getAddress("feeOracle")
        }
        data = { ...data, ...fee }
        if (data.initAndExec) {
            const moduleIsInit = await onChainDataManager.getModuleIsInit(sender, data.to)
            if (!moduleIsInit) {
                tempCallData = this.abiManager.encodeInitExecCall(data)
            } else {
                tempCallData = this.abiManager.encodeCall(data)
            }
        }
        else {
            tempCallData = this.abiManager.encodeCall(data)
        }
        return tempCallData
    }

    /**
     * Executes UserOp
     * @param {Auth} auth Auth class instance that signs the transaction
     * @param {function} transactionFunc Function that returns the data to be used in the transaction
     * @param {Object} txOptions Options for the transaction
     * @param {bool} estimate Whether to estimate gas or not
     * @returns {UserOp || receipt}
     */
    async execute(auth, transactionFunc, txOptions = global, estimate = false) {
        const options = await parseOptions(txOptions, "Wallet.execute")
        const chain = await this._getFromCache(options.chain)
        const estimatedOp = await this.estimateGas(auth, transactionFunc, options)
        if (estimate) {
            return estimatedOp
            // return estimatedOp.getMaxTxCost()
        }
        await estimatedOp.sign(auth, chain)
        if (options.sendTxLater) {
            return estimatedOp.op
        }
        return await this.sendTx(estimatedOp, options)
    }

    /**
    * Estimates gas for a transaction
    * @param {Auth} auth Auth class instance that signs the transaction
    * @param {function} transactionFunc Function that returns the data to be used in the transaction
    * @param {Options} txOptions Options for the transaction
    * @returns
    */
    async estimateGas(auth, transactionFunc, txOptions = global) {
        const options = await parseOptions(txOptions, "Wallet.estimateGas")
        const chain = await this._getFromCache(options.chain)
        const partialOp = await this._generatePartialUserOp(auth, transactionFunc, txOptions)
        const signature = await auth.getEstimateGasSignature()
        const res = await chain.estimateOpGas({
            ...partialOp,
            signature: signature.toLowerCase(),
            maxFeePerGas: 0,
            maxPriorityFeePerGas: 0,
            preVerificationGas: 0,
            callGasLimit: 0,
            verificationGasLimit: 10e6
        })
        return new UserOp({ ...partialOp, ...res, signature: signature, }, true)
    }

    async _getThisInitCode(chain, auth) {
        const owner = await auth.getOwnerAddr()
        const uniqueId = await this.identifier.getIdentifier()
        const entryPointAddress = await chain.getAddress("entryPointAddress")
        const factoryAddress = await chain.getAddress("factoryAddress")
        const verificationAddress = await chain.getAddress("verificationAddress")
        const initCodeParams = { uniqueId, owner, entryPointAddress, verificationAddress, factoryAddress }
        return this.abiManager.getInitCode(initCodeParams)
    }

    /**
     * Returns the wallet address
     * @param {*} options
     * @returns
     */
    async getAddress(options = global) {
        if (!this.address) {
            const parsedOptions = await parseOptions(options, "Wallet.getAddress")
            this.address = await (new WalletOnChainManager(parsedOptions.chain, this.identifier)).getWalletAddress()
        }
        return this.address
    }

    static async getAddress(authId, index, chain, apiKey) {
        global.apiKey = apiKey
        const uniqueId = await getUniqueId(authId)
        const chainObj = await getChainFromData(chain)
        const walletIdentifer = new WalletIdentifier({ uniqueId, index })
        const walletOnChainManager = new WalletOnChainManager(chainObj, walletIdentifer)
        return await walletOnChainManager.getWalletAddress()
    }

    async sendTx({ auth, op, call }, txOptions = global) {
        let userOp
        try {
            userOp = new UserOp(op)
        } catch (e) {
            if (typeof call == "function") {
                call = await call(options)
            }
            const { to, value, data } = call
            return await this.execute(auth, genCall({ to, value, data }), txOptions)
        }
        return await this.sendUserOp(userOp, txOptions)
    }

    /**
     * Sends a UserOp to the bundler
     * @param {UserOp} userOp
     * @param {Options} txOptions Options for the transaction
     * @returns
     */
    async sendUserOp(userOp, txOptions = global) {
        validateClassInstance(userOp, "UserOp", UserOp, "Wallet.sendUserOp")
        const options = await parseOptions(txOptions, "Wallet.execute")
        const chain = await this._getFromCache(options.chain)
        const ophash = await chain.sendOpToBundler(userOp)
        const onChainDataManager = new WalletOnChainManager(chain, this.identifier)
        const txid = await onChainDataManager.getTxId(ophash)
        const gas = await gasCalculation(txid, chain)
        const receipt = { ophash, txid, ...gas }
        DataServer.storeUserOp(userOp, 0, receipt)
        return receipt
    }

    /**
     *
     * @param {Auth?} auth Optional Auth class instance that signs the transaction if not already signed
     * @param {UserOp[]} ops list of UserOps to be sent
     * @param {*} txOptions
     * @returns
     */
    async sendTxs({ auth, ops }, txOptions = global) {
        const options = await parseOptions(txOptions, "Wallet.execute")
        const receipts = []
        for (let op of ops) {
            let receipt = await this.sendTx({ auth, op }, options)
            receipts.push(receipt)
        }
        return receipts
    }

    async _executeSubCall(call, ...args) {
        return await this[call](...args)
    }
}


/**
 * This is a hack to bind the functions of the FirstClassActions class to the FunWallet class
 * @returns {FunWallet}
 */
const modifiedActions = () => {
    const funcs = Object.getOwnPropertyNames(FirstClassActions.prototype)
    const bindedEstimateGasFunction = FunWallet.prototype.estimateGas

    const old = {}

    for (const func of funcs) {
        if (func == "constructor") continue
        const callfunc = async function (...args) {
            if (args.length <= 2) {
                return await this.parent._executeSubCall(func, ...args, global, true)
            }
            else if (args.length == 3) {
                return await this.parent._executeSubCall(func, ...args, true)
            }
            else {
                const helper = new Helper("Invalid number of parameters", args, "Invalid number of parameters")
                throw new ParameterFormatError("Wallet.estimateGas", helper)
            }
        }
        Object.assign(bindedEstimateGasFunction, { [func]: callfunc })
        old[func] = FirstClassActions.prototype[func]
    }

    const proto = { ...FunWallet.prototype, ...FirstClassActions.prototype }
    Object.assign(proto, { estimateGas: bindedEstimateGasFunction, ...old })
    Object.setPrototypeOf(FunWallet.prototype, proto)
    return FunWallet
}

module.exports = { FunWallet: modifiedActions() }