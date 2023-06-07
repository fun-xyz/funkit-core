import { Address, Hash, createPublicClient, http } from "viem"
import { OFF_CHAIN_ORACLE_ABI, entrypointContractInterface, factoryContractInterface } from "../common/constants"
import { Chain, WalletIdentifier, encodeLoginData } from "../data"
import { isContract } from "../utils"
import { ContractInterface } from "../viem/ContractInterface"

export class WalletOnChainManager {
    chain: Chain
    walletIdentifier: WalletIdentifier

    constructor(chain: Chain, walletIdentifier: WalletIdentifier) {
        this.chain = chain
        this.walletIdentifier = walletIdentifier
    }

    async getWalletAddress(): Promise<Address> {
        const uniqueId = await this.walletIdentifier.getIdentifier()
        const data = encodeLoginData({ salt: uniqueId })
        const factoryAddress = await this.chain.getAddress("factoryAddress")
        return await factoryContractInterface.readFromChain(factoryAddress, "getAddress", [data], this.chain)
    }

    static async getWalletAddress(identifier: string, rpcUrl: string, factoryAddress: Address): Promise<string> {
        const client = await createPublicClient({
            transport: http(rpcUrl)
        })
        return await factoryContractInterface.readFromChain(factoryAddress, "getAddress", [identifier], client)
    }

    async getTxId(userOpHash: string, timeout = 30000, interval = 5000) {
        const endtime = Date.now() + timeout
        const client = await this.chain.getClient()
        const entrypointAddress = await this.chain.getAddress("entryPointAddress")
        const filter = await entrypointContractInterface.createFilter(entrypointAddress, "UserOperationEvent", [userOpHash], client)
        while (Date.now() < endtime) {
            const events = await client.getFilterLogs({ filter })
            if (events.length > 0) {
                console
                return events[0].transactionHash
            }
            await new Promise((resolve) => setTimeout(resolve, interval))
        }
        return null
    }

    async getReceipt(hash: Hash) {
        const client = await this.chain.getClient()
        const txReceipt = await client.waitForTransactionReceipt({ hash })
        if (txReceipt && txReceipt.blockNumber) {
            return txReceipt
        }
        return null
    }

    async addressIsContract(address: Address) {
        const client = await this.chain.getClient()
        return isContract(address, client)
    }

    async getEthTokenPairing(token: string): Promise<bigint> {
        const offChainOracleAddress = await this.chain.getAddress("1inchOracleAddress")
        const oracleContractInterface = new ContractInterface(OFF_CHAIN_ORACLE_ABI)
        return await oracleContractInterface.readFromChain(offChainOracleAddress, "getRateToEth", [token, true], this.chain)
    }
}
