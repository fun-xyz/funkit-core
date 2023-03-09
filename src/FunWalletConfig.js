const { USDCPaymaster } = require("./paymasters/USDCPaymaster")
const { OnChainResources } = require("../utils/OnChainResources")
const { DataServer } = require("../utils/DataServer")
const { BasePaymaster } = require("./paymasters/BasePaymaster")

class FunWalletConfig {

    /**
    * Standard constructor
    * @params eoa, chain, prefundAmt, paymasterAddr, index
    * - eoa: an eoa wallet
    * - chain: Chain Id or Chain Name to specify the chains, e.g., for eth mainnet, use 1 or "ethereum"
    * - prefundAmt: the amount of eth to prefund the fun wallet
    * - paymaster: the paymaster instance to support gasless transactions
    * - implementationAddress: the fun wallet implementation address. used for fun wallet upgradability
    * - salt: the uniqueness of fun wallets. the default value is hash(eoa addr, index)
    * - index: part of the uniqueness of fun wallets. Use the different values for different wallets.
    */

    constructor(eoa, chain, prefundAmt, salt, paymaster = undefined, index = 0, implementationAddress = "") {
        if (!eoa || !chain) {
            throw Error("Eoa and chainId must be specified to construct FunWalletConfig")
        }
        this.eoa = eoa
        this.chain = chain;
        this.prefundAmt = prefundAmt

        if (paymaster && !(paymaster instanceof BasePaymaster)) {
            throw new Error("Paymaster must be of type BasePaymaster or children")
        }

        this.paymaster = paymaster
        this.index = index
        this.salt = salt
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
        let chain;
        if(this.chain == "ethereum-localfork") this.chain = 31337; //For local tests
        if(!Number(this.chain)){
            chain = await DataServer.getChainFromName(this.chain)
        } else {
            chain = await DataServer.getChainInfo(this.chain)
        }
        if (this.eoa.provider.connection.url === "metamask") {
            this.rpcUrl = rpcurl
        } else {
            this.rpcUrl = this.eoa.provider.connection.url
        }
        if(this.chain == "ethereum-localfork" || this.chain == 31337){
            this.chain_id = 31337
            this.chain_name = "ethereum-localfork"
        } else {
            this.chain_id = chain.chain;
            this.chain_name = chain.key;
        }
        this.chainCurrency = chain.currency
        this.bundlerUrl = chain.rpcdata.bundlerUrl
        this.entryPointAddr = chain.aaData.entryPointAddress
        this.funWalletFactoryAddr = chain.aaData.factoryAddress
        this.verificationAddr = chain.aaData.verificationAddress
    }
}

module.exports = { FunWalletConfig }
