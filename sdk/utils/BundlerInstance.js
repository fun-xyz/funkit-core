const ethers = require('ethers')
const { wrapProvider } = require("./Provider")
const { TreasuryAPI } = require("./TreasuryAPI")
const { HttpRpcClient } = require('@account-abstraction/sdk')

class BundlerInstance {
    static async connect(rpcurl, bundlerUrl, entryPointAddress, factoryAddress, verificationAddress, eoa, index = 0) {
        const provider = new ethers.providers.JsonRpcProvider(rpcurl);
        const config = { bundlerUrl, entryPointAddress }
        const net = await provider.getNetwork()
        const chainId = net.chainId

        const bundlerClient = new HttpRpcClient(bundlerUrl, entryPointAddress, chainId)
        const erc4337Provider = await wrapProvider(provider, config, eoa, factoryAddress, verificationAddress)

        const accountApi = new TreasuryAPI({
            provider: erc4337Provider,
            entryPointAddress,  //check this
            owner: eoa,
            factoryAddress,
            verificationAddress,
            index
        })

        return { bundlerClient, provider, accountApi }
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


module.exports = {
    BundlerInstance
}