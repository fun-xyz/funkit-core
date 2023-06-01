import fs from "fs"
import path from "path"
import { JsonRpcProvider } from "@ethersproject/providers"
import { BigNumber } from "ethers"
import { UserOperation } from "./UserOp"
import { getChainInfo, getModuleInfo } from "../apis"
import { Helper, MissingParameterError, ServerMissingDataError } from "../errors"
import { Bundler } from "../servers/Bundler"
import { flattenObj } from "../utils/DataUtils"

export interface ChainInput {
    chainId?: string
    rpcUrl?: string
    chainName?: string
    bundlerUrl?: string
}

export class Chain {
    chainId?: string
    rpcUrl?: string
    chainName?: string
    bundlerUrl?: string
    provider?: JsonRpcProvider
    bundler?: Bundler
    id?: string
    name?: string
    addresses?: any
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
        }
        if (this.chainName) {
            await this.loadChainData(this.chainName)
        }
        if (this.rpcUrl) {
            await this.loadProvider()
            const { chainId } = await this.provider!.getNetwork()
            await this.loadChainData(chainId.toString())
        }
        if (this.bundlerUrl) {
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
            this.bundler = new Bundler(this.id!, this.bundlerUrl!, this.addresses.EntryPoint)
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
                // const addresses = { ...chain.aaData, ...flattenObj(chain.moduleAddresses) }
                // Object.assign(this, { ...this, addresses, ...chain.rpcdata })
                const abisAddresses = this.loadAddressesFromAbis(chainId)
                // const abisAddresses = {
                //     AaveWithdraw: '0xF3e08E4a32AE0c6FE96232fad697dC249B754F88',
                //     ApproveAndExec: '0x2Ed4B26Bf71f15503A73F42648709E24e311FAc1',
                //     ApproveAndSwap: '0x48575D6B267CE2bd4cEc0537c768044a56C723d7',
                //     EntryPoint: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
                //     FunWalletFactory: '0x4FDffD240962F560BD3CA859a60034baa51ce3b2',
                //     GaslessPaymaster: '0xBe0715556f98c1EcCd020a593068692ddbA97cc1',
                //     TokenPaymaster: '0x068Df28a87DC1dD55730b7679e2e1e3E93d463dC',
                //     TokenPriceOracle: '0x601cD9fdF44EcE68bA5FF7b9273b5231d019e301',
                //     UserAuthentication: '0x8273fCeed934C9dd7FF57d883429Cc0026A4feE2'
                // }
                console.log("abisAddresses: ", abisAddresses)
                const addresses = { ...chain.aaData, ...flattenObj(chain.moduleAddresses), ...abisAddresses }
                Object.assign(this, { ...this, addresses, ...chain.rpcdata })
            }
        } catch (e) {
            const helper = new Helper("getChainInfo", chain, "call failed")
            helper.pushMessage(`Chain identifier ${chainId} not found`)

            throw new ServerMissingDataError("Chain.loadChainData", "DataServer", helper)
        }
    }

    async getAddress(name: string): Promise<string> {
        await this.init()
        const res = this.addresses[name]
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

    async getFeeData(): Promise<any> {
        await this.init()
        return await this.provider!.getFeeData()
    }

    async estimateOpGas(partialOp: UserOperation): Promise<any> {
        await this.init()
        const res = await this.bundler!.estimateUserOpGas(partialOp)
        const { verificationGas } = res
        let { preVerificationGas, callGasLimit } = res
        if (!(preVerificationGas || verificationGas || callGasLimit)) {
            throw new Error(JSON.stringify(res))
        }

        preVerificationGas = preVerificationGas.mul(2)
        const verificationGasLimit = verificationGas.add(50_000)
        if (partialOp.initCode !== "0x") {
            callGasLimit = BigNumber.from(10e6)
        }
        return { preVerificationGas, verificationGasLimit, callGasLimit }
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

export const getChainFromData = async (chainIdentifier: any): Promise<Chain> => {
    let chain

    if (chainIdentifier instanceof Chain) {
        return chainIdentifier
    }

    if (Number(chainIdentifier)) {
        chain = new Chain({ chainId: chainIdentifier })
    } else if (chainIdentifier.indexOf("http") + 1) {
        if (await verifyBundlerUrl(chainIdentifier)) {
            chain = new Chain({ bundlerUrl: chainIdentifier })
        } else {
            chain = new Chain({ rpcUrl: chainIdentifier })
        }
    } else {
        chain = new Chain({ chainName: chainIdentifier })
    }
    return chain
}
