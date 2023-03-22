const { WalletIdentifier } = require("../data/WalletIdentifier")
const { WalletAbiManager, WalletOnChainManager, configureEnvironment } = require("../managers")

const wallet = require("../abis/FunWallet.json")
const factory = require("../abis/FunWalletFactory.json")
const { verifyValidParametersForLocation, validateClassInstance, } = require("../utils/data")
const { parseOptions, prefundWallet } = require("../utils/chain")
const { UserOp } = require("../data")
const { constants } = require("ethers")
const { EoaAuth } = require("../auth")
const { parseEther } = require("ethers/lib/utils")
const { Chain } = require("../chain/Chain")

const executeExpectedKeys = ["chain", "apiKey"]

const userOpDefaultOptionalParams = {
    callGasLimit: 500_0000,
    verificationGasLimit: 5000_000,
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
        const options = await parseOptions(txOptions, location)
        verifyValidParametersForLocation(location, options, executeExpectedKeys)
        const chain = await this._getFromCache(options.chain)
        const onChainDataManager = new WalletOnChainManager(chain, this.identifier)
        const callData = this.abiManager.encodeCall(data)
        const sender = await this.getAddress(chain)
        const { maxFeePerGas, maxPriorityFeePerGas } = await chain.getFeeData()

        const initCode = (await onChainDataManager.addressIsContract(sender)) ? "0x" : (await this._getThisInitCode(chain, auth))

        let partialOp = { ...userOpDefaultOptionalParams, callData, sender, maxFeePerGas, maxPriorityFeePerGas, initCode, ...optionalParams }
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

    async getAddress(chain = global.chain) {
        validateClassInstance(chain, "chain", Chain, "FunWallet.getAddress")
        return await (new WalletOnChainManager(chain, this.identifier)).getWalletAddress()
    }

}

const genCall = (to, value) => {
    return () => {
        const data = { to, data: "0x", value: parseEther(`${value}`) }
        return { data }
    }
}

const main = async () => {
    const options = {
        chain: 31337,
        apiKey: "localtest"
    }
    await configureEnvironment(options)
    const wallet = new FunWallet()
    const auth = new EoaAuth({ privateKey: "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d" })
    const salt = await auth.getUniqueId()
    wallet.init({ salt, index: 0 })
    const toAddress = "0x3949c97925e5Aa13e34ddb18EAbf0B70ABB0C7d4"
    const address = await wallet.getAddress()
    const prefundReceipt = await prefundWallet(address, 1, auth)
    const opreceipt = await wallet.execute(auth, genCall(toAddress, 1))
    console.log(opreceipt)


}

main()
module.exports = { FunWallet }