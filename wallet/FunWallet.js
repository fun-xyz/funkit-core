const { UserOp, WalletIdentifier } = require("../data")
const { WalletAbiManager, WalletOnChainManager } = require("../managers")
const { verifyValidParametersForLocation, validateClassInstance, parseOptions, prefundWallet } = require("../utils")
const { FirstClassActions, genCall } = require("../actions")
const { TokenSponsor } = require("../sponsors")
const { ParameterFormatError } = require("../errors/ParameterError")
const { Helper } = require("../errors/Helper")

const wallet = require("../abis/FunWallet.json")
const factory = require("../abis/FunWalletFactory.json")
const executeExpectedKeys = ["chain", "apiKey"]

class FunWallet extends FirstClassActions {
    objCache = {}
    constructor(params) {
        super()
        this.estimateGas.parent = this
        this.identifier = new WalletIdentifier(params)
        this.abiManager = new WalletAbiManager(wallet.abi, factory.abi)
    }

    async _getFromCache(obj) {
        const storekey = `${obj.constructor.name}:${obj[obj.key]}`
        if (!this.objCache[storekey]) {
            await obj.init()
            this.objCache[storekey] = obj
        }
        return this.objCache[storekey]
    }

    async _generatePartialUserOp(auth, actionFunc, txOptions = global) {
        const options = await parseOptions(txOptions, "Wallet.execute")
        const chain = await this._getFromCache(options.chain)
        const actionData = {
            wallet: this,
            chain,
            options
        }
        const { data, errorData, optionalParams } = await actionFunc(actionData)
        {
            const { chain, apiKey } = options
            verifyValidParametersForLocation(errorData.location, { chain, apiKey }, executeExpectedKeys)
        }

        const onChainDataManager = new WalletOnChainManager(chain, this.identifier)

        const sender = await this.getAddress({ chain })

        let tempCallData;
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

        const callData = tempCallData
        const { maxFeePerGas, maxPriorityFeePerGas } = await chain.getFeeData()

        const initCode = (await onChainDataManager.addressIsContract(sender)) ? "0x" : (await this._getThisInitCode(chain, auth))
        let paymasterAndData = ""
        if (options.gasSponsor) {
            const sponsor = new TokenSponsor(options)
            paymasterAndData = await sponsor.getPaymasterAndData(options)
        }

        let partialOp = { callData, paymasterAndData, sender, maxFeePerGas, maxPriorityFeePerGas, initCode, ...optionalParams }
        const nonce = await auth.getNonce(partialOp)
        return { ...partialOp, nonce }
    }


    async execute(auth, actionFunc, txOptions = global, estimate = false) {
        const options = await parseOptions(txOptions, "Wallet.execute")
        const chain = await this._getFromCache(options.chain)
        const estimatedOp = await this.estimateGas(auth, actionFunc, options)

        if (estimate) {
            return estimatedOp
        }

        await estimatedOp.sign(auth, chain)
        if (options.sendTxLater) {
            return estimatedOp.op
        }
        return this.sendTx(estimatedOp, options)
    }

    async estimateGas(auth, actionFunc, txOptions = global) {
        const options = await parseOptions(txOptions, "Wallet.estimateGas")
        const chain = await this._getFromCache(options.chain)
        const partialOp = await this._generatePartialUserOp(auth, actionFunc, txOptions)
        const id = await auth.getUniqueId()
        const res = await chain.estimateOpGas({
            ...partialOp, signature: id,
            paymasterAndData: '0x',
            maxFeePerGas: 0,
            maxPriorityFeePerGas: 0,
            preVerificationGas: 0,
            callGasLimit: 0,
            verificationGasLimit: 10e6
        })
        return new UserOp({ ...partialOp, ...res, signature: id, }, true)
    }


    async _getThisInitCode(chain, auth) {
        const owner = await auth.getUniqueId()
        const salt = await this.identifier.getIdentifier()
        const entryPointAddress = await chain.getAddress("entryPointAddress")
        const factoryAddress = await chain.getAddress("factoryAddress")
        const verificationAddress = await chain.getAddress("verificationAddress")
        const initCodeParams = { salt, owner, entryPointAddress, verificationAddress, factoryAddress }
        return this.abiManager.getInitCode(initCodeParams)
    }

    async getAddress(options = global) {
        if (!this.address) {
            const parsedOptions = await parseOptions(options, "Wallet.getAddress")
            this.address = await (new WalletOnChainManager(parsedOptions.chain, this.identifier)).getWalletAddress()
        }
        return this.address
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


    async sendUserOp(userOp, txOptions = global) {
        validateClassInstance(userOp, "UserOp", UserOp, "Wallet.sendUserOp")
        const options = await parseOptions(txOptions, "Wallet.execute")
        const chain = await this._getFromCache(options.chain)
        const ophash = await chain.sendOpToBundler(userOp)
        const onChainDataManager = new WalletOnChainManager(chain, this.identifier)
        const txid = await onChainDataManager.getTxId(ophash)
        return { ophash, txid }
    }

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

const modifiedActions = () => {
    const funcs = Object.getOwnPropertyNames(FirstClassActions.prototype)
    const bindedEstimateGas = FunWallet.prototype.estimateGas
    const old = {}
    for (const func of funcs) {
        if (func == "constructor") continue
        const callfunc = async function (...args) {
            if (args.length == 2) {
                return await this.parent._executeSubCall(func, ...args, global, true)
            }
            if (args.length == 3) {
                return await this.parent._executeSubCall(func, ...args, true)
            }
            else {
                const helper = new Helper("Invalid number of parameters", args, "Invalid number of parameters")
                throw new ParameterFormatError("Wallet.estimateGas", helper)
            }
        }
        Object.assign(bindedEstimateGas, { [func]: callfunc })
        old[func] = FirstClassActions.prototype[func]
    }

    const proto = { ...FunWallet.prototype, ...FirstClassActions.prototype }
    Object.assign(proto, { estimateGas: bindedEstimateGas, ...old })
    Object.setPrototypeOf(FunWallet.prototype, proto)

    return FunWallet
}

module.exports = { FunWallet: modifiedActions() }
