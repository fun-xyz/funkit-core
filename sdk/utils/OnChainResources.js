const ethers = require('ethers')
const { wrapProvider } = require("./Provider")
const { TreasuryAPI } = require("./TreasuryAPI")
const { HttpRpcClient } = require('@account-abstraction/sdk')

class OnChainResources {
    static async connect(rpcurl, bundlerUrl, entryPointAddress, factoryAddress, verificationAddress, eoa, index = 0) {
        const provider = new ethers.providers.JsonRpcProvider(rpcurl);
        const config = { bundlerUrl, entryPointAddress }
        const erc4337Provider = await wrapProvider(provider, config, eoa, factoryAddress, verificationAddress)
        const accountApi = new TreasuryAPI({
            provider: erc4337Provider,
            entryPointAddress,  //check this
            owner: eoa,
            factoryAddress,
            verificationAddress,
            index
        })
        const net = await provider.getNetwork()
        const chainId = net.chainId
        this.client = new HttpRpcClient(bundlerUrl, entryPointAddress, chainId)

        return { bundlerClient:this.client, provider, accountApi }
    }

    static async connectEmpty(rpcurl, bundlerUrl, entryPointAddress, factoryAddress) {
        const provider = new ethers.providers.JsonRpcProvider(rpcurl);
        const chainId = (await provider.getNetwork()).chainId

        const bundlerClient = new HttpRpcClient(bundlerUrl, entryPointAddress, chainId)
        const accountApi = new TreasuryAPI({
            provider: provider,
            entryPointAddress: entryPointAddress,  //check this
            factoryAddress: factoryAddress
        })
        return { bundlerClient, accountApi }
    }
}

class Bundler {
    constructor(bundlerUrl, entryPointAddress, chainId) {
        this.client = new HttpRpcClient(bundlerUrl, entryPointAddress, chainId)
    }
}






module.exports = {
    OnChainResources
}