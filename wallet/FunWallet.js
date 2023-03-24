
const { UserOp, WalletIdentifier } = require("../data")
const { WalletAbiManager, WalletOnChainManager } = require("../managers")
const { verifyValidParametersForLocation, validateClassInstance, parseOptions, prefundWallet } = require("../utils")

const wallet = require("../abis/FunWallet.json")
const factory = require("../abis/FunWalletFactory.json")
const { FirstClassActions } = require("../actions")
const { TokenSponsor } = require("../sponsors")

const executeExpectedKeys = ["chain", "apiKey"]
const gasExpectedKeys = ["callGasLimit"]

const userOpDefaultParams = {
    verificationGasLimit: 100_000,
}

const userOpInitParams = {
    verificationGasLimit: 600_000,
}


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
        const { data, gasInfo, errorData, optionalParams } = await actionFunc(actionData)
        verifyValidParametersForLocation(errorData.location, options, executeExpectedKeys)

        if (gasInfo) {
            verifyValidParametersForLocation(errorData.location, gasInfo, gasExpectedKeys)
        }
        const onChainDataManager = new WalletOnChainManager(chain, this.identifier)

        const sender = await this.getAddress({ chain })

        let tempCallData;
        const moduleIsInit = await onChainDataManager.getModuleIsInit(sender, sender)
        if (data.initAndExec && !moduleIsInit) {
            tempCallData = this.abiManager.encodeInitExecCall(data)
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

        const gasParams = initCode == "0x" ? userOpDefaultParams : userOpInitParams
        if (paymasterAndData) {
            gasParams.verificationGasLimit += 50_000
        }
        let partialOp = { ...gasParams, ...gasInfo, callData, paymasterAndData, sender, maxFeePerGas, maxPriorityFeePerGas, initCode, ...optionalParams }
        const nonce = await auth.getNonce(partialOp)

        const op = { ...partialOp, nonce }

        const userOp = new UserOp(op)
        await userOp.sign(auth, chain)
        const ophash = await chain.sendOpToBundler(userOp)
        const txid = await onChainDataManager.getTxId(ophash)
        return { ophash, txid }
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
}


module.exports = { FunWallet }