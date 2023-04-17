const { Contract } = require("ethers")
const { WalletIdentifier, Chain } = require("../data")
const { validateClassInstance } = require("../utils/data")

const factoryAbi = require("../abis/FunWalletFactory.json").abi
const walletAbi = require("../abis/FunWallet.json").abi
const entryPointAbi = require("../abis/EntryPoint.json").abi


class WalletOnChainManager {
    constructor(chain, walletIdentifier) {
        const currentLocation = "WalletOnChainManager constructor"
        validateClassInstance(walletIdentifier, "walletIdentifier", WalletIdentifier, currentLocation)
        validateClassInstance(chain, "chain", Chain, currentLocation)
        this.chain = chain
        this.key = chain.key
        this.walletIdentifier = walletIdentifier
    }

    async init() {
        if (!this.factory) {
            const factoryAddress = await this.chain.getAddress("factoryAddress")
            const provider = await this.chain.getProvider()
            this.factory = new Contract(factoryAddress, factoryAbi, provider)
        }

        if (!this.entrypoint) {
            const entryPointAddress = await this.chain.getAddress("entryPointAddress")
            const provider = await this.chain.getProvider()
            this.entrypoint = new Contract(entryPointAddress, entryPointAbi, provider)
        }
    }

    async getWalletAddress() {
        await this.init()
        const uniqueID = await this.walletIdentifier.getIdentifier()
        return await this.factory.getAddress(uniqueID)
    }

    async getTxId(userOpHash, timeout = 30000, interval = 5000) {
        await this.init()
        const endtime = Date.now() + timeout;
        while (Date.now() < endtime) {
            const events = await this.entrypoint.queryFilter(this.entrypoint.filters.UserOperationEvent(userOpHash));
            if (events.length > 0) {
                return events[0].transactionHash;
            }
            await new Promise(resolve => setTimeout(resolve, interval));
        }
        return null;
    }

    async getReceipt(transactionHash) {
        await this.init()
        const provider = await this.chain.getProvider()
        const txReceipt = await provider.getTransactionReceipt(transactionHash);
        if (txReceipt && txReceipt.blockNumber) {
            return txReceipt;
        }
    }

    async getModuleIsInit(walletAddress, moduleAddress) {
        await this.init()
        const provider = await this.chain.getProvider()
        const contract = new Contract(walletAddress, walletAbi, provider)
        try {
            const data = await contract.getModuleStateVal(moduleAddress)
            return data != "0x"
        }
        catch (e) {
            return false
        }
    }

    async addressIsContract(address) {
        await this.init()
        const provider = await this.chain.getProvider()
        const addressCode = await provider.getCode(address)
        return !(addressCode.length == 2)
    }

    async getOpErrors() {
        await this.init()
    }
}


module.exports = { WalletOnChainManager }