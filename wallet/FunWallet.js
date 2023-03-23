const { WalletIdentifier } = require("../data/WalletIdentifier")
const { WalletAbiManager, WalletOnChainManager, configureEnvironment } = require("../managers")

const wallet = require("../abis/FunWallet.json")
const factory = require("../abis/FunWalletFactory.json")
const { verifyValidParametersForLocation, validateClassInstance, } = require("../utils/data")
const { parseOptions } = require("../utils/chain")
const { UserOp } = require("../data")
const { Chain } = require("../chain/Chain")
const { BigNumber } = require("ethers")
const { keccak256, toUtf8Bytes } = require("ethers/lib/utils")

const { gasCalculation } = require('../utils/userop')

const executeExpectedKeys = ["chain", "apiKey"]

const userOpDefaultOptionalParams = {
    callGasLimit: 500_0000,
    verificationGasLimit: 150_000,
}

class FunWallet {
    objCache = {}
    async init(params) {
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
        const { data, location, optionalParams } = await actionFunc(this)
        console.log(data)
        const options = await parseOptions(txOptions, location)
        verifyValidParametersForLocation(location, options, executeExpectedKeys)
        const chain = await this._getFromCache(options.chain)
        const callData = this.abiManager.encodeCall(data)
        const sender = await this.getAddress(chain)
        const { maxFeePerGas, maxPriorityFeePerGas } = await chain.getFeeData()

        const initCode = (await chain.addressIsContract(sender)) ? "0x" : (await this._getThisInitCode(auth, chain))

        let partialOp = { ...userOpDefaultOptionalParams, callData, sender, maxFeePerGas, maxPriorityFeePerGas, initCode, ...optionalParams }
        const nonce = await this._getNonce(partialOp)

        const op = { ...partialOp, nonce }
        const userOp = new UserOp(op)
        await userOp.sign(auth, chain)
        console.log(userOp.op)
        const ophash = await chain.sendOpToBundler(userOp)
        const txid = await chain.getTxId(ophash)
        const gasData = await gasCalculation(txid, chain.provider, chain.currency)

        return { ophash, txid, ...gasData}
    }

    async _getThisInitCode(auth, chain = global.chain) {
        const owner = await auth.getUniqueId()
        const salt = await this.identifier.getIdentifier()
        const entryPointAddress = await chain.getAddress("entryPointAddress")
        const factoryAddress = await chain.getAddress("factoryAddress")
        const verificationAddress = await chain.getAddress("verificationAddress")
        const initCodeParams = { salt, owner, entryPointAddress, verificationAddress, factoryAddress }
        return this.abiManager.getInitCode(initCodeParams)
    }

    async getAddress(chain) {
        validateClassInstance(chain, "chain", Chain, "FunWallet.getAddress")
        return await (new WalletOnChainManager(chain, this.identifier)).getWalletAddress()
    }

    async _getNonce({ sender, callData }, timeout = 1000) {
        const now = Date.now()
        const time = now - now % timeout
        return BigNumber.from(keccak256(toUtf8Bytes(`${sender}${callData}${time}`)));
    }

}


module.exports = { FunWallet }