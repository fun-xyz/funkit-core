import fs from "fs"
import path from "path"
import { FeeData, JsonRpcProvider, TransactionResponse } from "@ethersproject/providers"
import { Contract, Signer } from "ethers"
import { Addresses, ChainInput, UserOperation } from "./types"
import { getChainInfo, getModuleInfo } from "../apis"
import { EstimateGasResult } from "../common"
import { ENTRYPOINT_ABI } from "../common/constants"
import { Helper, MissingParameterError, ServerMissingDataError } from "../errors"
import { Bundler } from "../servers/Bundler"
import { flattenObj } from "../utils/DataUtils"

export class Chain {
    chainId?: string
    rpcUrl?: string
    chainName?: string
    bundlerUrl?: string
    provider?: JsonRpcProvider
    bundler?: Bundler
    id?: string
    name?: string
    addresses: Addresses = {}
    currency?: string

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
            await this.loadProvider()
            const { chainId } = await this.provider!.getNetwork()
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
            await this.loadProvider()
        } catch {
            // ignore
        }
    }

    async loadProvider() {
        if (!this.provider) {
            this.provider = new JsonRpcProvider(this.rpcUrl)
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
            this.bundler = new Bundler(this.id, this.bundlerUrl, this.addresses.entryPointAddress)
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
                const abisAddresses = this.loadAddressesFromAbis(chainId)
                const addresses = { ...chain.aaData, ...flattenObj(chain.moduleAddresses), ...abisAddresses }
                Object.assign(this, { ...this, addresses, ...chain.rpcdata })
                this.modifyAddresses()
            }
        } catch (e) {
            const helper = new Helper("getChainInfo", chain, "call failed")
            helper.pushMessage(`Chain identifier ${chainId} not found`)

            throw new ServerMissingDataError("Chain.loadChainData", "DataServer", helper)
        }
    }

    async getAddress(name: string): Promise<string> {
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
        const { chainId } = await this.provider!.getNetwork()
        return chainId.toString()
    }

    async getChainId(): Promise<string> {
        await this.init()
        return this.id!
    }

    async getProvider(): Promise<JsonRpcProvider> {
        await this.init()
        return this.provider!
    }

    setAddress(name: string, address: string) {
        if (!this.addresses) this.addresses = {}
        this.addresses[name] = address
    }

    async sendOpToBundler(userOp: UserOperation): Promise<string> {
        await this.init()
        return await this.bundler!.sendUserOpToBundler(userOp)
    }

    async sendOpToEntryPoint(userOp: UserOperation, signer: Signer): Promise<TransactionResponse> {
        const provider = await this.getProvider()
        const entrypointContract = new Contract(this.addresses.entryPointAddress, ENTRYPOINT_ABI, provider)
        const tx = await entrypointContract.populateTransaction.handleOps([userOp], await signer.getAddress())
        return await signer.sendTransaction(tx)
    }

    async getFeeData(): Promise<FeeData> {
        await this.init()
        return await this.provider!.getFeeData()
    }

    async estimateOpGas(partialOp: UserOperation): Promise<EstimateGasResult> {
        await this.init()
        const res = await this.bundler!.estimateUserOpGas(partialOp)
        const { callGasLimit } = res
        let { preVerificationGas, verificationGasLimit } = res
        if (!(preVerificationGas || verificationGasLimit || res.callGasLimit)) {
            throw new Error(JSON.stringify(res))
        }

        preVerificationGas = preVerificationGas.mul(2)
        verificationGasLimit = verificationGasLimit.add(100_000)
        return { preVerificationGas, verificationGasLimit, callGasLimit }
    }

    modifyAddresses() {
        const modifications = {
            eoaAaveWithdrawAddress: "AaveWithdraw",
            approveAndExecAddress: "ApproveAndExec",
            tokenSwapAddress: "ApproveAndSwap",
            gaslessSponsorAddress: "GaslessPaymaster",
            tokenSponsorAddress: "TokenPaymaster",
            oracle: "TokenPriceOracle",
            entryPointAddress: "EntryPoint",
            factoryAddress: "FunWalletFactory",
            feeOracle: "FeePercentOracle",
            userAuthAddress: "UserAuthentication",
            rbacAddress: "RoleBasedAccessControl"
        }

        Object.keys(modifications).forEach((key) => {
            const newAddress = this.addresses[modifications[key]]
            if (newAddress) {
                this.addresses![key] = newAddress
            }
        })
    }

    private loadAddressesFromAbis(chainId: string): { [key: string]: string } {
        const abisDir = path.resolve(__dirname, "..", "abis")
        let fileNames: string[] = []

        try {
            fileNames = fs.readdirSync(abisDir)
        } catch (err) {
            console.error(`Error reading directory ${abisDir}: ${err}`)
            return {}
        }

        const addresses: { [key: string]: string } = {}

        for (const fileName of fileNames) {
            const filePath = path.join(abisDir, fileName)
            let fileContent = ""

            try {
                fileContent = fs.readFileSync(filePath, "utf8")
            } catch (err) {
                console.error(`Error reading file ${filePath}: ${err}`)
                continue
            }

            let jsonContent

            try {
                jsonContent = JSON.parse(fileContent)
            } catch (err) {
                console.error(`Error parsing JSON content from ${filePath}: ${err}`)
                continue
            }

            if (jsonContent.addresses && jsonContent.addresses[chainId]) {
                addresses[jsonContent.name] = jsonContent.addresses[chainId]
            }
        }
        return addresses
    }
}

const verifyBundlerUrl = async (url: string) => {
    const provider = new JsonRpcProvider(url)
    const data = await provider.send("web3_clientVersion", [])
    return data.indexOf("aa-bundler") + 1
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
        if (await verifyBundlerUrl(chainIdentifier)) {
            return new Chain({ bundlerUrl: chainIdentifier })
        } else {
            return new Chain({ rpcUrl: chainIdentifier })
        }
    }
    return new Chain({ chainName: chainIdentifier })
}
