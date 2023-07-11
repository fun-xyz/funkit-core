import { JsonRpcProvider } from "@ethersproject/providers"
import { getChainId } from "../apis"
import { EstimateGasResult } from "../common"
import { UserOperation } from "../data/"
import { Helper, NoServerConnectionError } from "../errors"
import { objectify } from "../utils"

export class Bundler {
    chainId: string
    bundlerUrl: string
    entryPointAddress: string
    provider: JsonRpcProvider

    constructor(chainId: string, bundlerUrl: string, entryPointAddress: string) {
        this.chainId = chainId
        this.bundlerUrl = bundlerUrl
        this.entryPointAddress = entryPointAddress
        this.provider = new JsonRpcProvider(this.bundlerUrl)
    }
    async validateChainId() {
        // validate chainId is in sync with expected chainid
        // let response
        try {
            // response = await validateChainId(this.chainId)
        } catch (e) {
            console.log(e)
            const helper = new Helper("Chain ID", this.chainId, "Cannot connect to bundler.")
            throw new NoServerConnectionError("Chain.loadBundler", "Bundler", helper, true)
        }

        // if (Number(response) !== Number(this.chainId)) {
        //     throw new Error(`Bundler chainId ${JSON.stringify(response)} does not match expected chainId ${this.chainId}`)
        // }
    }

    async sendUserOpToBundler(userOp: UserOperation): Promise<string> {
        // const hexifiedUserOp = deepHexlify(userOp)
        // const response = await sendUserOpToBundler(hexifiedUserOp, this.entryPointAddress, this.chainId)
        const response = await this.provider.send("eth_sendUserOperation", [objectify(userOp), this.entryPointAddress])
        return response
    }

    async estimateUserOpGas(userOp: UserOperation): Promise<EstimateGasResult> {
        // const hexifiedUserOp = deepHexlify(userOp)
        // const res = await estimateUserOpGas(hexifiedUserOp, this.entryPointAddress, this.chainId)
        const res = await this.provider.send("eth_estimateUserOperationGas", [objectify(userOp), this.entryPointAddress])

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
