const ethers = require('ethers')
const { wrapProvider } = require("./Provider")
const { FunWalletDataProvider } = require("./FunWalletDataProvider")
const { HttpRpcClient } = require('@account-abstraction/sdk')

class OnChainResources {
    static async connect(rpcUrl, bundlerUrl, entryPointAddress, implementationAddress, factoryAddress, verificationAddress, paymasterAPI, eoa, preHashSalt, index = 0) {
        const bundlerClient = await this.connectBundler(rpcUrl, bundlerUrl, entryPointAddress)
        const funWalletDataProvider = await OnChainResources.connectFunWalletDataProvider(rpcUrl, bundlerUrl, entryPointAddress, implementationAddress, factoryAddress,
            verificationAddress, paymasterAPI, eoa, preHashSalt, index)
        return { bundlerClient, funWalletDataProvider }
    }

    static async connectEmpty(rpcUrl, bundlerUrl, entryPointAddress, factoryAddress) {
        const bundlerClient = await this.connectBundler(rpcUrl, bundlerUrl, entryPointAddress)
        const funWalletDataProvider = await this.connectEmptyFunWalletDataProvider(rpcUrl, entryPointAddress, factoryAddress)
        return { bundlerClient, funWalletDataProvider }
    }

    static async connectBundler(rpcUrl, bundlerUrl, entryPointAddress) {
        const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
        const chainId = (await provider.getNetwork()).chainId
        return new HttpRpcClient(bundlerUrl, entryPointAddress, chainId)
    }

    static async connectFunWalletDataProvider(rpcUrl, bundlerUrl, entryPointAddress, implementationAddress, factoryAddress, verificationAddress, paymasterAPI, eoa, preHashSalt, index = 0) {
        const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
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

    static async connectEmptyFunWalletDataProvider(rpcUrl, entryPointAddress, factoryAddress) {
        const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
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