const { USDCPaymaster } = require("./paymasters/USDCPaymaster")
const testConfig = require("../test/testConfig.json")
const { OnChainResources } = require("../utils/OnChainResources")
const { DataServer } = require("../utils/DataServer")

const LOCAL_FORK_CHAIN_ID = 31337

class FunWalletConfig {
    constructor(eoa, chainId, prefundAmt, salt, implementationAddress = "", paymasterAddr = "", index = 0) {
        this.eoa = eoa
        this.chainId = chainId
        this.prefundAmt = prefundAmt
        this.salt = salt
        this.index = index
        this.implementationAddress = implementationAddress

        if (paymasterAddr) {
            this.paymaster = new USDCPaymaster(paymasterAddr)
        }
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
        if (this.chainId != LOCAL_FORK_CHAIN_ID) {
            const {
                rpcdata: { bundlerUrl },
                aaData: { entryPointAddress, factoryAddress, verificationAddress }
            } = await DataServer.getChainInfo(this.chainId)

            this.bundlerUrl = bundlerUrl
            this.entryPointAddr = entryPointAddress
            this.funWalletFactoryAddr = factoryAddress
            this.verificationAddr = verificationAddress
        } else {
            this.bundlerUrl = "http://localhost:3000/rpc"
            this.entryPointAddr = testConfig.entryPointAddress
            this.funWalletFactoryAddr = testConfig.factoryAddress
            this.verificationAddr = testConfig.verificationAddress
        }
    }
}

module.exports = { FunWalletConfig }