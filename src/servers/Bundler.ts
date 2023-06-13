import { estimateUserOpGas, getChainId, sendUserOpToBundler, validateChainId } from "../apis"
import { EstimateGasResult } from "../common"
import { UserOperation } from "../data/"
import { Helper, NoServerConnectionError } from "../errors"
import { deepHexlify } from "../utils/DataUtils"

export class Bundler {
    chainId: string
    bundlerUrl: string
    entryPointAddress: string

    constructor(chainId: string, bundlerUrl: string, entryPointAddress: string) {
        this.chainId = chainId
        this.bundlerUrl = bundlerUrl
        this.entryPointAddress = entryPointAddress
    }
    async validateChainId() {
        // validate chainId is in sync with expected chainid
        let response
        try {
            response = await validateChainId(this.chainId)
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
        const hexifiedUserOp = deepHexlify(userOp)
        const response = await sendUserOpToBundler(hexifiedUserOp, this.entryPointAddress, this.chainId)
        return response
    }

    async estimateUserOpGas(userOp: UserOperation): Promise<EstimateGasResult> {
        const hexifiedUserOp = deepHexlify(userOp)
        const res = await estimateUserOpGas(hexifiedUserOp, this.entryPointAddress, this.chainId)
        console.log(res)
        if (!(res.preVerificationGas || res.verificationGas || res.callGasLimit)) {
            throw new Error(JSON.stringify(res))
        }
        return {
            ...res
        }
    }

    static async getChainId(bundlerUrl: string): Promise<string> {
        return await getChainId(bundlerUrl)
    }
}
