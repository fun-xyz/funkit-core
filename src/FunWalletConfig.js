const { USDCPaymaster } = require("./paymasters/USDCPaymaster")
const testConfig = require("../test/testConfig.json")
const { OnChainResources } = require("../utils/OnChainResources")

const LOCAL_FORK_CHAIN_ID = 11111

export class FunWalletConfig {
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
        return await OnChainResources.connect(this.rpcurl, this.bundlerUrl, this.entryPointAddr, this.funWalletFactoryAddr, 
            this.verificationAddr, this.paymaster, this.eoa, this.index)
    }
    
    async getChainInfo() {
        this.rpcUrl = this.eoa.provider.connection.url
        if (this.chainId != LOCAL_FORK_CHAIN_ID) {
            const {
                rpcdata: { bundlerUrl },
                aaData: { entryPointAddress: entryPointAddr, factoryAddress: funWalletFactoryAddr, verificationAddress: verificationAddr }
            } = await DataServer.getChainInfo(this.chainId)
            
            this.bundlerUrl = bundlerUrl
            this.entryPointAddr = entryPointAddr
            this.funWalletFactoryAddr = funWalletFactoryAddr
            this.verificationAddr = verificationAddr
        } else {
            this.bundlerUrl = "http://localhost:3000/rpc"
            this.entryPointAddr = testConfig.entryPointAddress
            this.funWalletFactoryAddr = testConfig.factoryAddress
            this.verificationAddr = testConfig.verificationAddress
        }
    }
}