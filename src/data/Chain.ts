import { Address, Hex, PublicClient, createPublicClient, http } from "viem"
import { Addresses, ChainInput, UserOperation } from "./types"
import { estimateOp, getChainFromId, getChainFromName, getModuleInfo } from "../apis"
import { CONTRACT_ADDRESSES, ENTRYPOINT_CONTRACT_INTERFACE, EstimateGasResult } from "../common"
import { ErrorCode, InternalFailureError, InvalidParameterError, ResourceNotFoundError } from "../errors"
import { isContract } from "../utils"

export class Chain {
    private initialized = false
    private id?: string
    private name?: string
    private addresses: Addresses = {}
    private currency?: string
    private rpcUrl?: string
    private client?: PublicClient

    constructor(chainInput: ChainInput) {
        if (chainInput.chainId) {
            this.id = chainInput.chainId
        } else if (chainInput.rpcUrl) {
            this.rpcUrl = chainInput.rpcUrl
        } else if (chainInput.chainName) {
            this.name = chainInput.chainName
        }
    }

    private async init() {
        if (this.initialized) return

        if (this.id) {
            await this.loadChain(this.id)
        } else if (this.name) {
            await this.loadChain(this.name)
        } else if (this.rpcUrl) {
            await this.loadChainFromRpc()
        }

        this.initialized = true
    }

    private async loadChainFromRpc() {
        this.client = createPublicClient({
            transport: http(this.rpcUrl)
        })
        this.id = (await this.client.getChainId()).toString()
        await this.loadChain(this.id)
    }

    private async loadChain(identifier: string) {
        let chain
        if (!Number(identifier)) {
            chain = await getChainFromName(identifier)
        } else {
            chain = await getChainFromId(identifier)
        }
        this.id = chain.id
        this.name = chain.name
        this.currency = chain.nativeCurrency.symbol
        const abisAddresses = Object.keys(CONTRACT_ADDRESSES).reduce((result, key) => {
            result[key] = CONTRACT_ADDRESSES[key][this.id]
            return result
        }, {})
        const addresses = { ...abisAddresses }
        this.rpcUrl = chain.rpcUrls.default
        this.client = createPublicClient({
            transport: http(this.rpcUrl)
        })
        Object.assign(this, { ...this, addresses })
    }

    async getChainId(): Promise<string> {
        await this.init()
        return this.id!
    }

    async getChainName(): Promise<string> {
        await this.init()
        return this.name!
    }

    async getAddress(name: string): Promise<Address> {
        await this.init()
        const res = this.addresses![name]
        if (!res) {
            throw new ResourceNotFoundError(
                ErrorCode.AddressNotFound,
                "address not found",
                "chain.getAddress",
                { name },
                "Provide correct name to query address",
                "https://docs.fun.xyz"
            )
        }
        return res
    }

    async getModuleAddresses(name: string): Promise<string[]> {
        await this.init()
        return await getModuleInfo(name, this.id!)
    }

    async getCurrency(): Promise<string> {
        await this.init()
        return this.currency!
    }

    async getClient(): Promise<PublicClient> {
        await this.init()
        return this.client!
    }

    async getFeeData(): Promise<bigint> {
        await this.init()
        return this.client!.getGasPrice()
    }

    async estimateOpGas(partialOp: UserOperation): Promise<EstimateGasResult> {
        await this.init()
        if (!this.addresses || !this.addresses.entryPointAddress) {
            throw new InternalFailureError(
                ErrorCode.AddressNotFound,
                "entryPointAddress is required",
                "chain.estimateOpGas",
                { partialOp },
                "This is an internal error, please contact support.",
                "https://docs.fun.xyz"
            )
        }

        let { preVerificationGas, callGasLimit, verificationGasLimit } = await estimateOp({
            chainId: this.id!,
            entryPointAddress: this.addresses.entryPointAddress,
            userOp: partialOp
        })
        if (!preVerificationGas || !verificationGasLimit || !callGasLimit) {
            throw new Error(JSON.stringify({ preVerificationGas, callGasLimit, verificationGasLimit }))
        }
        callGasLimit = BigInt(callGasLimit) * 2n
        preVerificationGas = BigInt(preVerificationGas) * 2n
        verificationGasLimit = BigInt(verificationGasLimit!) + 200_000n
        return { preVerificationGas, verificationGasLimit, callGasLimit }
    }

    async getTxId(userOpHash: string, timeout = 60_000, interval = 5_000, fromBlock?: bigint): Promise<Hex | null> {
        const endtime = Date.now() + timeout
        const client = await this.getClient()
        const entryPointAddress = await this.getAddress("entryPointAddress")
        fromBlock = fromBlock ? fromBlock : (await client.getBlockNumber()) - 100n
        let filter
        while (Date.now() < endtime) {
            let events
            if ((await client.getChainId()) === 84531 || (await client.getChainId()) === 36865) {
                events = await ENTRYPOINT_CONTRACT_INTERFACE.getLog(
                    entryPointAddress,
                    "UserOperationEvent",
                    { userOpHash },
                    client,
                    fromBlock
                )
            } else {
                filter = await ENTRYPOINT_CONTRACT_INTERFACE.createFilter(
                    entryPointAddress,
                    "UserOperationEvent",
                    [userOpHash],
                    client,
                    fromBlock
                )
                events = await client.getFilterLogs({ filter })
            }

            if (events.length > 0) {
                return events[0].transactionHash
            }
            await new Promise((resolve) => setTimeout(resolve, interval))
        }
        return null
    }

    async addressIsContract(address: Address): Promise<boolean> {
        return isContract(address, await this.getClient())
    }
}

export const getChainFromData = async (chainIdentifier?: string | Chain | number): Promise<Chain> => {
    if (!chainIdentifier) {
        throw new InvalidParameterError(
            ErrorCode.InvalidChainIdentifier,
            "valid chain identifier is required, could be chainId, chainName or Fun Chain object",
            "chain.getChainFromData",
            { chainIdentifier },
            "Please provide valid chain identifier",
            "https://docs.fun.xyz"
        )
    }

    let chain: Chain
    if (chainIdentifier instanceof Chain) {
        return chainIdentifier
    }

    if (typeof chainIdentifier === "number" || Number(chainIdentifier)) {
        chain = new Chain({ chainId: chainIdentifier.toString() })
    } else if (chainIdentifier.indexOf("http") + 1) {
        chain = new Chain({ rpcUrl: chainIdentifier })
    } else {
        chain = new Chain({ chainName: chainIdentifier })
    }

    const global = globalThis as any
    global.globalEnvOption.chain = chain
    return chain
}
