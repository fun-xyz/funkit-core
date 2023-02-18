const { USDCPaymaster } = require("./paymasters/USDCPaymaster")
const { OnChainResources } = require("../utils/OnChainResources")
const { DataServer } = require("../utils/DataServer")

class FunWalletConfig {
    
    /**
    * Standard constructor
    * @params eoa, chainId, prefundAmt, paymasterAddr, index
    * - eoa: an eoa wallet
    * - chainId: chainId to specify the chains, e.g., for eth mainnet, use 1
    * - prefundAmt: the amount of eth to prefund the fun wallet
    * - paymasterAddr: the address of the paymaster which is used to support gasless transactions
    * - index: the uniqueness of fun wallets. Use the different values for different users.
    */
    constructor(eoa, chainId, prefundAmt, paymasterAddr, index = 0) {
        if (!eoa || !chainId ) {
            throw Error("Eoa and chainId must be specified to construct FunWalletConfig")
        }
        this.eoa = eoa
        this.chainId = chainId
        this.prefundAmt = prefundAmt
        if (paymasterAddr) {
            this.paymaster = new USDCPaymaster(paymasterAddr)
        }
        this.index = index
    }

    async getClients() {
        await this.getChainInfo()
        if (!this.eoa) {
            return await OnChainResources.connectEmpty(this.rpcUrl, this.bundlerUrl, this.entryPointAddr, this.funWalletFactoryAddr)
        } else {
            return await OnChainResources.connect(this.rpcUrl, this.bundlerUrl, this.entryPointAddr, this.funWalletFactoryAddr, 
                this.verificationAddr, this.paymaster, this.eoa, this.index)
        }
    }
    
    async getChainInfo() {
        this.rpcUrl = this.eoa.provider.connection.url
        const {
            rpcdata: { bundlerUrl },
            aaData: { entryPointAddress, factoryAddress, verificationAddress },
            currency
        } = await DataServer.getChainInfo(this.chainId)

        this.chainCurrency=currency
        this.bundlerUrl = bundlerUrl
        this.entryPointAddr = entryPointAddress
        this.funWalletFactoryAddr = factoryAddress
        this.verificationAddr = verificationAddress
    }
}

module.exports = { FunWalletConfig }