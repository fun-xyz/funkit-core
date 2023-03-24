const { WalletIdentifier, Chain } = require("../data")
const { validateClassInstance } = require("../utils/data")

const factoryAbi = require("../abis/FunWalletFactory.json")
const entryPointAbi = require("../abis/EntryPoint.json")

const { Contract } = require("ethers")

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
            this.factory = new Contract(factoryAddress, factoryAbi.abi, provider)
        }

        if (!this.entrypoint) {
            const entryPointAddress = await this.chain.getAddress("entryPointAddress")
            const provider = await this.chain.getProvider()
            this.entrypoint = new Contract(entryPointAddress, entryPointAbi.abi, provider)
        }
    }

    async getWalletAddress() {
        await this.init()
        const salt = await this.walletIdentifier.getIdentifier()
        return await this.factory.getAddress(salt)
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
        const provider = await this.chain.getProvider()
        const txReceipt = await provider.getTransactionReceipt(transactionHash);
        if (txReceipt && txReceipt.blockNumber) {
            return txReceipt;
        }
    }

    async addressIsContract(address) {
        const provider = await this.chain.getProvider()
        const addressCode = await provider.getCode(address)
        return !(addressCode.length == 2)
    }

    async getOpErrors() {
        await this.init()

    }
}


const chain = new Chain({ chainId: 5 })
const identifier = new WalletIdentifier({ salt: "sdfa" })

const main = async () => {
    const onchain = new WalletOnChainManager(chain, identifier)
    await onchain.getReceipt("0x6d970b07efab0d65ea70df7c3db62ef9736fd5fa7b0e7211ac340f3a1734bd27")
}


// main()


module.exports = { WalletOnChainManager }