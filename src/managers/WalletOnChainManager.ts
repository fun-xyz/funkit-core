import { TransactionReceipt } from "@ethersproject/providers"
import { Contract, ethers } from "ethers"
import entryPoint from "../abis/EntryPoint.json"
import wallet from "../abis/FunWallet.json"
import factory from "../abis/FunWalletFactory.json"
import offChainOracle from "../abis/OffChainOracle.json"
import { Chain, WalletIdentifier } from "../data"

const factoryAbi = factory.abi
const walletAbi = wallet.abi
const entryPointAbi = entryPoint.abi
const offChainOracleAbi = offChainOracle.abi

export class WalletOnChainManager {
    chain: Chain
    walletIdentifier: WalletIdentifier
    factory?: Contract
    entrypoint?: Contract

    constructor(chain: Chain, walletIdentifier: WalletIdentifier) {
        this.chain = chain
        this.walletIdentifier = walletIdentifier
    }

    async init() {
        if (!this.factory) {
            const factoryAddress = await this.chain.getAddress("FunWalletFactory")
            const provider = await this.chain.getProvider()
            this.factory = new Contract(factoryAddress, factoryAbi, provider)
        }

        if (!this.entrypoint) {
            const entryPointAddress = await this.chain.getAddress("EntryPoint")
            const provider = await this.chain.getProvider()
            this.entrypoint = new Contract(entryPointAddress, entryPointAbi, provider)
        }
    }

    async getWalletAddress(): Promise<string> {
        await this.init()
        const uniqueId = await this.walletIdentifier.getIdentifier()
        return await this.factory!.getAddress(uniqueId)
    }

    static async getWalletAddress(identifier: string, rpcUrl: string, factoryAddress: string): Promise<string> {
        const provider = new ethers.providers.JsonRpcProvider(rpcUrl)
        const factory = new ethers.Contract(factoryAddress, factoryAbi, provider)
        return await factory.getAddress(identifier)
    }

    async getTxId(userOpHash: string, timeout = 30000, interval = 5000): Promise<string | undefined> {
        await this.init()
        const endtime = Date.now() + timeout
        while (Date.now() < endtime) {
            const events = await this.entrypoint!.queryFilter(this.entrypoint!.filters.UserOperationEvent(userOpHash))
            if (events.length > 0) {
                return events[0].transactionHash
            }
            await new Promise((resolve) => setTimeout(resolve, interval))
        }
        return undefined
    }

    async getReceipt(txHash: string): Promise<TransactionReceipt | undefined> {
        await this.init()
        const provider = await this.chain.getProvider()
        const txReceipt = await provider.getTransactionReceipt(txHash)
        if (txReceipt && txReceipt.blockNumber) {
            return txReceipt
        }
        return undefined
    }

    async getModuleIsInit(walletAddress: string, moduleAddress: string) {
        await this.init()
        const provider = await this.chain.getProvider()
        const contract = new Contract(walletAddress, walletAbi, provider)
        try {
            const data = await contract.getModuleStateVal(moduleAddress)
            return data !== "0x"
        } catch (e) {
            return false
        }
    }

    async addressIsContract(address: string) {
        await this.init()
        const provider = await this.chain.getProvider()
        const addressCode = await provider.getCode(address)
        return !(addressCode.length === 2)
    }

    async getEthTokenPairing(token: string) {
        const offChainOracleAddress = await this.chain.getAddress("1inchOracleAddress")
        const provider = await this.chain.getProvider()
        const oracle = new Contract(offChainOracleAddress, offChainOracleAbi, provider)
        return await oracle.getRateToEth(token, true)
    }
}
