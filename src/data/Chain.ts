import { Address, PublicClient, createPublicClient, http } from "viem"
import { Addresses, ChainInput, UserOperation } from "./types"
import { getChainInfo, getModuleInfo } from "../apis"
import { EstimateGasResult } from "../common"
import { CONTRACT_ADDRESSES } from "../common/constants"
import { Helper, MissingParameterError, ServerMissingDataError } from "../errors"
import { Bundler } from "../servers/Bundler"
import { flattenObj } from "../utils/DataUtils"

export class Chain {
    chainId?: string
    rpcUrl?: string
    chainName?: string
    bundlerUrl?: string
    bundler?: Bundler
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
        } else if (chainInput.bundlerUrl) {
            this.bundlerUrl = chainInput.bundlerUrl
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
        } else if (this.bundlerUrl) {
            const bundlerChainId = await Bundler.getChainId(this.bundlerUrl)
            await this.loadChainData(bundlerChainId)
            await this.loadBundler()
        }

        try {
            await this.loadBundler()
        } catch {
            // ignore
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

    async loadBundler() {
        if (!this.bundler) {
            if (!this.id || !this.bundlerUrl || !this.addresses || !this.addresses.entryPointAddress) {
                const currentLocation = "Chain.loadBundler"
                const helperMainMessage = "{id,bundlerUrl,addresses, or addresses.entryPointAddress} are missing"
                const helper = new Helper(`${currentLocation} was given these parameters`, this, helperMainMessage)
                throw new MissingParameterError(currentLocation, helper)
            }
            this.bundler = new Bundler(
                this.id,
                "https://api.pimlico.io/v1/goerli/rpc?apikey=176ee560-e982-41fb-a908-fc5dd044643d",
                this.addresses.entryPointAddress
            )
            await this.bundler.validateChainId()
        }
    }

    async loadChainData(chainId: string) {
        let chain
        try {
            if (!this.id) {
                chain = await getChainInfo(chainId)
                this.id = chain.chain
                this.name = chain.key
                this.currency = chain.currency
                const abisAddresses = Object.keys(CONTRACT_ADDRESSES).reduce((result, key) => {
                    result[key] = CONTRACT_ADDRESSES[key][chainId]
                    return result
                }, {})
                const addresses = { ...chain.aaData, ...flattenObj(chain.moduleAddresses), ...abisAddresses }
                Object.assign(this, { ...this, addresses, ...chain.rpcdata })
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

    setAddress(name: string, address: Address) {
        if (!this.addresses) this.addresses = {}
        this.addresses[name] = address
    }

    async sendOpToBundler(userOp: UserOperation): Promise<string> {
        await this.init()
        return await this.bundler!.sendUserOpToBundler(userOp)
    }

    async getFeeData(): Promise<any> {
        await this.init()
        return this.client!.getGasPrice()
    }

    async estimateOpGas(partialOp: UserOperation): Promise<EstimateGasResult> {
        await this.init()
        const res = await this.bundler!.estimateUserOpGas(partialOp)
        let { preVerificationGas, callGasLimit, verificationGas: verificationGasLimit } = res
        if (!(preVerificationGas || verificationGasLimit || callGasLimit)) {
            throw new Error(JSON.stringify(res))
        }
        callGasLimit = BigInt(callGasLimit)
        preVerificationGas = BigInt(preVerificationGas) * 2n
        verificationGasLimit = BigInt(verificationGasLimit!) + 100_000n
        return { preVerificationGas, verificationGasLimit, callGasLimit }
    }
}

export const getChainFromData = async (chainIdentifier?: string | Chain): Promise<Chain> => {
    if (!chainIdentifier) {
        const helper = new Helper("getChainFromData", chainIdentifier, "chainIdentifier is required")
        throw new MissingParameterError("Chain.getChainFromData", helper)
    }
    if (chainIdentifier instanceof Chain) {
        return chainIdentifier
    }

    if (chainIdentifier.indexOf("http") + 1) {
        return new Chain({ rpcUrl: chainIdentifier })
    }
    return new Chain({ chainName: chainIdentifier })
}
