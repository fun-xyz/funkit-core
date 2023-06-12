import { Address, Hex, PublicClient, encodeFunctionData } from "viem"
import { TransactionData } from "../common"
import { Chain } from "../data"

type ChainReadCall = {
    functionName: string
    args?: any[]
}

export class ContractInterface {
    abi: any
    constructor(abi: any) {
        this.abi = abi
    }

    async readFromChain(address: Address, functionName: string, args: any[], chainOrClient: Chain | PublicClient): Promise<any> {
        const client = await parseClient(chainOrClient)
        return await client.readContract({
            abi: this.abi,
            address,
            functionName,
            args
        })
    }

    async batchReadFromChain(address: Address, chainOrClient: Chain | PublicClient, calls: ChainReadCall[]): Promise<any[]> {
        const client = await parseClient(chainOrClient)
        return await Promise.all(
            calls.map(async (call) => {
                return this.readFromChain(address, call.functionName, call.args ? call.args : [], client)
            })
        )
    }

    encodeTransactionData(address: Address, functionName: string, args: any[]): TransactionData {
        const data = encodeFunctionData({
            abi: this.abi,
            functionName,
            args
        })
        return { to: address, data, value: 0n }
    }

    encodeData(functionName: string, args: any[]): Hex {
        return encodeFunctionData({
            abi: this.abi,
            functionName,
            args
        })
    }

    async createFilter(address: Address, eventName: any, args: any, chainOrClient: PublicClient | Chain) {
        const client = await parseClient(chainOrClient)
        return await client.createContractEventFilter({
            abi: this.abi,
            address,
            eventName,
            args,
            fromBlock: (await client.getBlockNumber()) - 100n
        })
    }
}

const parseClient = async (chainOrClient: PublicClient | Chain): Promise<PublicClient> => {
    if (chainOrClient instanceof Chain) {
        const chain = chainOrClient as Chain
        return await chain.getClient()
    } else if (typeof chainOrClient.readContract === "function") {
        return chainOrClient as PublicClient
    } else {
        throw new Error("No client or chain provided")
    }
}
