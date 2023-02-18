const ethers = require('ethers')
const { wrapProvider } = require("./Provider")
const { FunWalletDataProvider } = require("./FunWalletDataProvider")
const { HttpRpcClient } = require('@account-abstraction/sdk')

class OnChainResources {
    static async connect(rpcurl, bundlerUrl, entryPointAddress, implementationAddress, factoryAddress, verificationAddress, paymasterAPI, eoa, preHashSalt, index = 0) {
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
        const net = await provider.getNetwork()
        const chainId = net.chainId
        const bundlerClient = new HttpRpcClient(bundlerUrl, entryPointAddress, chainId)

        return { bundlerClient, funWalletDataProvider }
    }

    static async connectEmpty(rpcurl, bundlerUrl, entryPointAddress, factoryAddress) {
        const provider = new ethers.providers.JsonRpcProvider(rpcurl);
        const chainId = (await provider.getNetwork()).chainId
        const bundlerClient = new HttpRpcClient(bundlerUrl, entryPointAddress, chainId)
        const funWalletDataProvider = new FunWalletDataProvider({
            provider: provider,
            entryPointAddress: entryPointAddress,
            factoryAddress: factoryAddress
        })
        return { bundlerClient, funWalletDataProvider }
    }
}

module.exports = {
    OnChainResources
}