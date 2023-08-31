import { Address, Hex, PublicClient, createPublicClient, http } from "viem"
import { Addresses, ChainInput, UserOperation } from "./types"
import { estimateOp, getChainFromId, getChainFromName, getModuleInfo } from "../apis"
import {
    BASE_PIMLICO_PAYMASTER_AND_DATA_ESTIMATION,
    CONTRACT_ADDRESSES,
    ENTRYPOINT_CONTRACT_INTERFACE,
    ETHEREUM_PIMLICO_PAYMASTER_AND_DATA_ESTIMATION,
    EstimateGasResult,
    OPTIMISM_PIMLICO_PAYMASTER_AND_DATA_ESTIMATION
} from "../common"
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

    private static chain: Chain

    private constructor(chainInput: ChainInput) {
        if (!chainInput.chainIdentifier && !chainInput.rpcUrl) {
            throw new InvalidParameterError(
                ErrorCode.InvalidChainIdentifier,
                "valid chain identifier or rpcUrl is required, could be chainId, chainName, Fun Chain object, or rpcUrl",
                { chainInput },
                "Please provide valid chain identifier or rpcUrl",
                "https://docs.fun.xyz"
            )
        }

        if (chainInput.rpcUrl) {
            this.rpcUrl = chainInput.rpcUrl
        } else if (chainInput.chainIdentifier instanceof Chain) {
            return chainInput.chainIdentifier
        } else if (typeof chainInput.chainIdentifier === "number" || Number(chainInput.chainIdentifier)) {
            this.id = chainInput.chainIdentifier!.toString()
        } else {
            this.name = chainInput.chainIdentifier
        }
    }

    public static async getChain(chainInput: ChainInput): Promise<Chain> {
        if (chainInput.chainIdentifier instanceof Chain) {
            return chainInput.chainIdentifier
        } else if (
            !Chain.chain ||
            ((await Chain.chain.getChainId()) !== chainInput.chainIdentifier?.toString() &&
                (await Chain.chain.getChainName()) !== chainInput.chainIdentifier?.toString() &&
                (await Chain.chain.getRpcUrl()) !== chainInput.rpcUrl)
        ) {
            if (typeof chainInput.chainIdentifier === "string") {
                chainInput.chainIdentifier = chainInput.chainIdentifier.replace(/\s/g, "")
            }
            if (chainInput.chainIdentifier === "ethereum-goerli") {
                chainInput.chainIdentifier = "goerli"
            }
            if (chainInput.chainIdentifier === "polygon") {
                chainInput.chainIdentifier = "polygon-mainnet"
            }

            Chain.chain = new Chain(chainInput)
        }
        return Chain.chain
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

    async getRpcUrl(): Promise<string> {
        await this.init()
        return this.rpcUrl!
    }

    async getAddress(name: string): Promise<Address> {
        await this.init()
        const res = this.addresses![name]
        if (!res) {
            throw new ResourceNotFoundError(
                ErrorCode.AddressNotFound,
                "address not found",
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
                { partialOp },
                "This is an internal error, please contact support.",
                "https://docs.fun.xyz"
            )
        }
        // clone partialOp and replace paymasterAndData with a workaround for pimlico since they overestimate gas limits for simulation
        const estimationUserOp = Object.assign({}, partialOp)
        if (this.id === "8453") {
            estimationUserOp.paymasterAndData = BASE_PIMLICO_PAYMASTER_AND_DATA_ESTIMATION
        } else if (this.id === "10") {
            estimationUserOp.paymasterAndData = OPTIMISM_PIMLICO_PAYMASTER_AND_DATA_ESTIMATION
        } else if (this.id === "1") {
            estimationUserOp.paymasterAndData = ETHEREUM_PIMLICO_PAYMASTER_AND_DATA_ESTIMATION
        }

        let { preVerificationGas, callGasLimit, verificationGasLimit } = await estimateOp({
            chainId: this.id!,
            entryPointAddress: this.addresses.entryPointAddress,
            userOp: estimationUserOp
        })
        if (!preVerificationGas || !verificationGasLimit || !callGasLimit) {
            throw new Error(JSON.stringify({ preVerificationGas, callGasLimit, verificationGasLimit }))
        }
        callGasLimit = BigInt(callGasLimit) * 2n
        preVerificationGas = BigInt(preVerificationGas)
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
