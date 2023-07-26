import { Address, PublicClient, createPublicClient, http } from "viem"
import { Addresses, ChainInput, UserOperation } from "./types"
import { estimateOp, getChainInfo, getModuleInfo } from "../apis"
import { CONTRACT_ADDRESSES, EstimateGasResult } from "../common"
import { Helper, MissingParameterError, ServerMissingDataError } from "../errors"

export class Chain {
    chainId?: string
    rpcUrl?: string
    chainName?: string
    id?: string
    name?: string
    addresses: Addresses = {}
    currency?: string

    // viem
    client?: PublicClient

    constructor(chainInput: ChainInput) {
        if (chainInput.chainId) {
            this.chainId = chainInput.chainId
        } else if (chainInput.rpcUrl) {
            this.rpcUrl = chainInput.rpcUrl
        } else if (chainInput.chainName) {
            this.chainName = chainInput.chainName
        }
    }

    async init() {
        if (this.chainId) {
            await this.loadChainData(this.chainId.toString())
        } else if (this.chainName) {
            await this.loadChainData(this.chainName)
        } else if (this.rpcUrl) {
            await this.loadClient()
            const chainId = await this.client!.getChainId()
            await this.loadChainData(chainId.toString())
        }

        try {
            await this.loadClient()
        } catch {
            // ignore
        }
    }

    async loadClient() {
        if (!this.client) {
            this.client = createPublicClient({
                transport: http(this.rpcUrl)
            })
        }
    }

    async loadChainData(chainId: string) {
        let chain
        try {
            if (!this.id) {
                chain = await getChainInfo(chainId)
                this.id = chain.id
                this.name = chain.name
                this.currency = chain.nativeCurrency.symbol
                const abisAddresses = Object.keys(CONTRACT_ADDRESSES).reduce((result, key) => {
                    result[key] = CONTRACT_ADDRESSES[key][this.id]
                    return result
                }, {})
                const addresses = { ...abisAddresses }
                Object.assign(this, { ...this, addresses, rpcUrl: chain.rpcUrls.default })
            }
        } catch (e) {
            const helper = new Helper("getChainInfo", chain, "call failed")
            helper.pushMessage(`Chain identifier ${chainId} not found`)

            throw new ServerMissingDataError("Chain.loadChainData", "DataServer", helper)
        }
    }

    async getAddress(name: string): Promise<Address> {
        await this.init()
        const res = this.addresses![name]
        if (!res) {
            const currentLocation = "Chain.getAddress"
            const helperMainMessage = "Search key does not exist"
            const helper = new Helper(`${currentLocation} was given these parameters`, name, helperMainMessage)
            throw new MissingParameterError(currentLocation, helper)
        }
        return res
    }

    async getModuleAddresses(name: string): Promise<string[]> {
        await this.init()
        return await getModuleInfo(name, this.id!)
    }

    async getActualChainId(): Promise<string> {
        await this.init()
        const chainId = await this.client!.getChainId()
        return chainId.toString()
    }

    async getChainId(): Promise<string> {
        await this.init()
        return this.id!
    }

    async getClient(): Promise<PublicClient> {
        await this.init()
        return this.client!
    }

    setAddresses(addresses: Addresses) {
        if (!this.addresses) this.addresses = addresses
        else this.addresses = { ...this.addresses, ...addresses }
    }

    async getFeeData(): Promise<bigint> {
        await this.init()
        return this.client!.getGasPrice()
    }

    async estimateOpGas(partialOp: UserOperation): Promise<EstimateGasResult> {
        await this.init()
        if (!this.addresses || !this.addresses.entryPointAddress) {
            const currentLocation = "data.chain"
            const helper = new Helper(currentLocation, "", "entryPointAddress is required.")
            throw new MissingParameterError(currentLocation, helper)
        }

        let { preVerificationGas, callGasLimit, verificationGasLimit } = await estimateOp({
            chainId: this.chainId!,
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
}

export const getChainFromData = async (chainIdentifier?: string | Chain | number): Promise<Chain> => {
    if (!chainIdentifier) {
        const helper = new Helper("getChainFromData", chainIdentifier, "chainIdentifier is required")
        throw new MissingParameterError("Chain.getChainFromData", helper)
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
    return chain
}
