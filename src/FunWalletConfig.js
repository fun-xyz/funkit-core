const { USDCPaymaster } = require("./paymasters/USDCPaymaster")
const { OnChainResources } = require("../utils/OnChainResources")
const { DataServer } = require("../utils/DataServer")
const { BasePaymaster } = require("./paymasters/BasePaymaster")

class FunWalletConfig {

    /**
    * Standard constructor
    * @params eoa, chainId, prefundAmt, paymasterAddr, index
    * - eoa: an eoa wallet
    * - chainId: chainId to specify the chains, e.g., for eth mainnet, use 1
    * - prefundAmt: the amount of eth to prefund the fun wallet
    * - paymaster: the paymaster instance to support gasless transactions
    * - implementationAddress: the fun wallet implementation address. used for fun wallet upgradability
    * - salt: the uniqueness of fun wallets. the default value is hash(eoa addr, index)
    * - index: part of the uniqueness of fun wallets. Use the different values for different wallets.
    */

    constructor(eoa, chainId, prefundAmt, paymaster = undefined, implementationAddress = "", salt, index = 0) {
        if (!eoa || !chainId) {
            throw Error("Eoa and chainId must be specified to construct FunWalletConfig")
        }
        this.eoa = eoa
        this.chainId = chainId
        this.prefundAmt = prefundAmt

        if (!(paymaster instanceof BasePaymaster || !paymaster)) {
            throw new Error("Paymaster must be of type BasePaymaster or children")
        }

        this.paymaster = paymaster
        this.index = index
        this.salt = (salt ? salt : eoa.address) + index.toString()
        this.implementationAddress = implementationAddress
    }

    async getClients() {
        await this.getChainInfo()
        if (!this.eoa) {
            return await OnChainResources.connectEmpty(this.rpcUrl, this.bundlerUrl, this.entryPointAddr, this.funWalletFactoryAddr)
        } else {
            return await OnChainResources.connect(this.rpcUrl, this.bundlerUrl, this.entryPointAddr, this.implementationAddress, this.funWalletFactoryAddr,
                this.verificationAddr, this.paymaster, this.eoa, this.salt, this.index)
        }
    }

    async getChainInfo() {
        this.rpcUrl = this.eoa.provider.connection.url
        const {
            rpcdata: { bundlerUrl },
            aaData: { entryPointAddress, factoryAddress, verificationAddress },
            currency
        } = await DataServer.getChainInfo(this.chainId)

        this.chainCurrency = currency
        this.bundlerUrl = bundlerUrl
        this.entryPointAddr = entryPointAddress
        this.funWalletFactoryAddr = factoryAddress
        this.verificationAddr = verificationAddress
    }
}

module.exports = { FunWalletConfig }
