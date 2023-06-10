import { Address, Hash, Hex, TransactionReceipt, createPublicClient, http } from "viem"
import { ENTRYPOINT_CONTRACT_INTERFACE, FACTORY_CONTRACT_INTERFACE, OFF_CHAIN_ORACLE_ABI } from "../common/constants"
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
        return await FACTORY_CONTRACT_INTERFACE.readFromChain(factoryAddress, "getAddress", [data], this.chain)
    }

    static async getWalletAddress(identifier: string, rpcUrl: string, factoryAddress: Address): Promise<Address> {
        const client = await createPublicClient({
            transport: http(rpcUrl)
        })
        return await FACTORY_CONTRACT_INTERFACE.readFromChain(factoryAddress, "getAddress", [identifier], client)
    }

    async getTxId(userOpHash: string, timeout = 120_000, interval = 5_000): Promise<Hex | null> {
        const endtime = Date.now() + timeout
        const client = await this.chain.getClient()
        const entrypointAddress = await this.chain.getAddress("entryPointAddress")
        const filter = await ENTRYPOINT_CONTRACT_INTERFACE.createFilter(entrypointAddress, "UserOperationEvent", [userOpHash], client)
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

    async getReceipt(hash: Hash): Promise<TransactionReceipt | undefined> {
        const client = await this.chain.getClient()
        const txReceipt = await client.waitForTransactionReceipt({ hash })
        if (txReceipt && txReceipt.blockNumber) {
            return txReceipt
        }
        return undefined
    }

    async addressIsContract(address: Address): Promise<boolean> {
        const client = await this.chain.getClient()
        return isContract(address, client)
    }

    async getEthTokenPairing(token: string): Promise<bigint> {
        const offChainOracleAddress = await this.chain.getAddress("1inchOracleAddress")
        const oracleContractInterface = new ContractInterface(OFF_CHAIN_ORACLE_ABI)
        return await oracleContractInterface.readFromChain(offChainOracleAddress, "getRateToEth", [token, true], this.chain)
    }
}
