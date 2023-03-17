const ethers = require('ethers')
const { wrapProvider } = require("./Provider")
const { FunWalletDataProvider } = require("./FunWalletDataProvider")
const { HttpRpcClient } = require('@account-abstraction/sdk')

class OnChainResources {
    static async connect(rpcurl, bundlerUrl, entryPointAddress, implementationAddress, factoryAddress, verificationAddress, paymasterAPI, eoa, preHashSalt, index = 0) {
        const bundlerClients = await Promise.all(bundlerUrl.map((url) => { return OnChainResources.connectBundler(rpcurl, url, entryPointAddress) }))
        const funWalletDataProvider = await OnChainResources.connectFunWalletDataProvider(rpcurl, bundlerUrl, entryPointAddress, implementationAddress, factoryAddress,
            verificationAddress, paymasterAPI, eoa, preHashSalt, index)
        return { bundlerClients, funWalletDataProvider }
    }

    static async connectEmpty(rpcurl, bundlerUrl, entryPointAddress, factoryAddress) {
        const bundlerClients = await Promise.all(bundlerUrl.map((url) => { return this.connectBundler(rpcurl, url, entryPointAddress) }))
        const funWalletDataProvider = await this.connectEmptyFunWalletDataProvider(rpcurl, entryPointAddress, factoryAddress)
        return { bundlerClients, funWalletDataProvider }
    }

    static async connectBundler(rpcurl, bundlerUrl, entryPointAddress) {
        const provider = new ethers.providers.JsonRpcProvider(rpcurl);
        const chainId = (await provider.getNetwork()).chainId
        return new HttpRpcClient(bundlerUrl, entryPointAddress, chainId)
    }

    static async connectFunWalletDataProvider(rpcurl, bundlerUrl, entryPointAddress, implementationAddress, factoryAddress, verificationAddress, paymasterAPI, eoa, preHashSalt, index = 0) {
        const provider = new ethers.providers.JsonRpcProvider(rpcurl);
        const config = { bundlerUrl, entryPointAddress }
        const salt = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(`${preHashSalt}`))
        const erc4337Provider = await wrapProvider(provider, config, eoa, implementationAddress, salt, factoryAddress, verificationAddress)
        const funWalletDataProvider = new FunWalletDataProvider({
            provider: erc4337Provider,
            entryPointAddress,
            owner: eoa,
            paymasterAPI,
            factoryAddress,
            verificationAddress,
            implementationAddress,
            salt,
            index
        })
        return funWalletDataProvider
    }

    static async connectEmptyFunWalletDataProvider(rpcurl, entryPointAddress, factoryAddress) {
        const provider = new ethers.providers.JsonRpcProvider(rpcurl);
        const funWalletDataProvider = new FunWalletDataProvider({
            provider: provider,
            entryPointAddress: entryPointAddress,
            factoryAddress: factoryAddress
        })
        return funWalletDataProvider
    }
}

module.exports = {
    OnChainResources
}