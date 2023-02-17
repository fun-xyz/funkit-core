const { USDCPaymaster } = require("./paymasters/USDCPaymaster")
const { OnChainResources } = require("../utils/OnChainResources")
const { DataServer } = require("../utils/DataServer")

class FunWalletConfig {
    constructor(eoa, chainId, prefundAmt, paymasterAddr, index = 0) {
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
            aaData: { entryPointAddress, factoryAddress, verificationAddress }
        } = await DataServer.getChainInfo(this.chainId)
        
        this.bundlerUrl = bundlerUrl
        this.entryPointAddr = entryPointAddress
        this.funWalletFactoryAddr = factoryAddress
        this.verificationAddr = verificationAddress
    }
}

module.exports = { FunWalletConfig }