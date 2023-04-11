const { UserOp, WalletIdentifier } = require("../data")
const { WalletAbiManager, WalletOnChainManager } = require("../managers")
const { verifyValidParametersForLocation, validateClassInstance, parseOptions, prefundWallet } = require("../utils")

const wallet = require("../abis/FunWallet.json")
const factory = require("../abis/FunWalletFactory.json")
const { FirstClassActions, genCall } = require("../actions")
const { TokenSponsor, MultiTokenSponsor } = require("../sponsors")
const { MissingParameterError, Helper } = require("../errors")
const executeExpectedKeys = ["chain", "apiKey"]
const gasExpectedKeys = ["callGasLimit"]
const callExpectedKeys = ["to", "data"]


class FunWallet extends FirstClassActions {
    objCache = {}
    constructor(params) {
        super()
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

    async execute(auth, actionFunc, txOptions = global) {
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

        const op = { ...partialOp, nonce }
        const id = await auth.getUniqueId()

        const res = await chain.estimateOpGas({
            ...op, signature: id,
            paymasterAndData: '0x',
            callGasLimit: 10e6,
            maxFeePerGas: 0,
            maxPriorityFeePerGas: 0,
            preVerificationGas: 0,
            verificationGasLimit: 10e6


        })
        let { preVerificationGas, verificationGas, callGasLimit } = res
        preVerificationGas = Math.ceil(parseInt(preVerificationGas) * 1.2)
        verificationGas = Math.ceil(parseInt(verificationGas) * (paymasterAndData == "0x" ? 1.45 : 1.5))
        callGasLimit = Math.ceil(parseInt(callGasLimit) * 1.4)
        const userOp = new UserOp({ ...op, preVerificationGas, verificationGasLimit: verificationGas, callGasLimit })
        await userOp.sign(auth, chain)
        if (options.sendTxLater) {
            return userOp.op
        }
        return this.sendTx(userOp, options)
    }
    // goerli implementation: 0xF30ca362C658BF50F9aFaAD0cbB95cfB6E50D901
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
}

module.exports = { FunWallet }
