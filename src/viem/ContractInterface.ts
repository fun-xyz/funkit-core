import { Address, Hex, PublicClient, encodeFunctionData } from "viem"
import { TransactionParams } from "../common"
import { Chain } from "../data"
import { stringify } from "../utils"

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
        try {
            return await client.readContract({
                abi: this.abi,
                address,
                functionName,
                args
            })
        } catch (e) {
            throw new Error(`Error reading from chain: \n ${stringify(e)}`)
        }
    }

    async batchReadFromChain(address: Address, chainOrClient: Chain | PublicClient, calls: ChainReadCall[]): Promise<any[]> {
        const client = await parseClient(chainOrClient)
        return await Promise.all(
            calls.map(async (call) => {
                return this.readFromChain(address, call.functionName, call.args ? call.args : [], client)
            })
        )
    }

    encodeTransactionParams(address: Address, functionName: string, args: any[], value = 0n): TransactionParams {
        const data = encodeFunctionData({
            abi: this.abi,
            functionName,
            args
        })
        return { to: address, data, value }
    }

    encodeData(functionName: string, args: any[]): Hex {
        return encodeFunctionData({
            abi: this.abi,
            functionName,
            args
        })
    }

    async createFilter(address: Address, eventName: any, args: any, chainOrClient: PublicClient | Chain, fromBlock: bigint) {
        const client = await parseClient(chainOrClient)
        return await client.createContractEventFilter({
            abi: this.abi,
            address,
            eventName,
            args,
            fromBlock: fromBlock
        })
    }

    async getLog(address: Address, name: string, args: any, chainOrClient: PublicClient | Chain, fromBlock: bigint): Promise<any[]> {
        const client = await parseClient(chainOrClient)
        const event = getItemFromAbi(this.abi, name, "event")
        return await client.getLogs({
            address,
            event,
            args,
            fromBlock
        })
    }
}

export const parseClient = async (chainOrClient: PublicClient | Chain): Promise<PublicClient> => {
    if (chainOrClient instanceof Chain) {
        const chain = chainOrClient as Chain
        return await chain.getClient()
    } else if (typeof chainOrClient.readContract === "function") {
        return chainOrClient as PublicClient
    } else {
        throw new Error("No client or chain provided")
    }
}

const getItemFromAbi = (abi: any, name: string, type: string): any => {
    const item = abi.find((item: any) => item.name === name && item.type === type)
    if (!item) {
        throw new Error(`No ${type} with name ${name} found in abi`)
    }
    return item
}
