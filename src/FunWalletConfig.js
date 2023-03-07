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
    * - userId: the uniqueness of fun wallets. the default value is hash(eoa addr, index)
    * - index: part of the uniqueness of fun wallets. Use the different values for different wallets.
    */

    constructor(eoa, chainId, prefundAmt = 0, userId, paymaster = undefined, index = 0, implementationAddress = "") {
        if (!eoa || !chainId) {
            throw Error("Eoa and chainId must be specified to construct FunWalletConfig")
        }
        this.eoa = eoa
        this.chainId = chainId
        this.prefundAmt = prefundAmt

        if (paymaster && !(paymaster instanceof BasePaymaster)) {
            throw new Error("Paymaster must be of type BasePaymaster or children")
        }

        this.paymaster = paymaster
        this.index = index
        this.userId = userId
        this.implementationAddress = implementationAddress
    }

    async getClients() {
        await this.getChainInfo()
        if (!this.eoa) {
            return await OnChainResources.connectEmpty(this.rpcUrl, this.bundlerUrl, this.entryPointAddr, this.funWalletFactoryAddr)
        } else {
            return await OnChainResources.connect(this.rpcUrl, this.bundlerUrl, this.entryPointAddr, this.implementationAddress, this.funWalletFactoryAddr,
                this.verificationAddr, this.paymaster, this.eoa, this.userId, this.index)
        }
    }

    async getChainInfo() {
        const {
            rpcdata: { bundlerUrl, rpcurl },
            aaData: { entryPointAddress, factoryAddress, verificationAddress },
            currency
        } = await DataServer.getChainInfo(this.chainId)

        if (this.eoa.provider.connection.url === "metamask") {
            this.rpcUrl = rpcurl
        } else {
            this.rpcUrl = this.eoa.provider.connection.url
        }

        this.chainCurrency = currency
        this.bundlerUrl = bundlerUrl
        this.entryPointAddr = entryPointAddress
        this.funWalletFactoryAddr = factoryAddress
        this.verificationAddr = verificationAddress
    }
}

module.exports = { FunWalletConfig }
