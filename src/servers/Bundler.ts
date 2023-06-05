import { JsonRpcProvider } from "@ethersproject/providers"
import { BigNumber } from "ethers"
import { resolveProperties } from "ethers/lib/utils"
import { estimateUserOpGas, getChainId, sendUserOpToBundler, validateChainId } from "../apis"
import { EstimateGasResult } from "../common"
import { LOCAL_FORK_CHAIN_ID } from "../common/constants"
import { UserOperation } from "../data/"
import { Helper, NoServerConnectionError } from "../errors"
import { deepHexlify } from "../utils/DataUtils"

export class Bundler {
    chainId: string
    bundlerUrl: string
    entryPointAddress: string
    userOpJsonRpcProvider?: JsonRpcProvider

    constructor(chainId: string, bundlerUrl: string, entryPointAddress: string) {
        this.chainId = chainId
        this.bundlerUrl = bundlerUrl
        this.entryPointAddress = entryPointAddress
        this.userOpJsonRpcProvider = Number(chainId) === LOCAL_FORK_CHAIN_ID ? new JsonRpcProvider(this.bundlerUrl) : undefined
    }
    async validateChainId() {
        // validate chainId is in sync with expected chainid
        let response
        try {
            response = await validateChainId(this.chainId, this.userOpJsonRpcProvider)
        } catch (e) {
            console.log(e)
            const helper = new Helper("Chain ID", this.chainId, "Cannot connect to bundler.")
            throw new NoServerConnectionError("Chain.loadBundler", "Bundler", helper, true)
        }

        if (Number(response) !== Number(this.chainId)) {
            throw new Error(`Bundler chainId ${response} does not match expected chainId ${this.chainId}`)
        }
    }

    async sendUserOpToBundler(userOp: UserOperation): Promise<string> {
        const hexifiedUserOp = deepHexlify(await resolveProperties(userOp))
        const response = await sendUserOpToBundler(hexifiedUserOp, this.entryPointAddress, this.chainId, this.userOpJsonRpcProvider)
        return response
    }

    async estimateUserOpGas(userOp: UserOperation): Promise<EstimateGasResult> {
        const hexifiedUserOp = deepHexlify(await resolveProperties(userOp))
        const res = await estimateUserOpGas(hexifiedUserOp, this.entryPointAddress, this.chainId, this.userOpJsonRpcProvider)
        if (!(res.preVerificationGas || res.verificationGas || res.callGasLimit)) {
            throw new Error(JSON.stringify(res))
        }
        return {
            callGasLimit: BigNumber.from(res.callGasLimit),
            verificationGasLimit: BigNumber.from(res.verificationGas),
            preVerificationGas: BigNumber.from(res.preVerificationGas)
        }
    }

    static async getChainId(bundlerUrl: string): Promise<string> {
        return await getChainId(bundlerUrl)
    }
}
