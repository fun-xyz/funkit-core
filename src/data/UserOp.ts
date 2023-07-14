import { Hex } from "viem"
import { Chain, getChainFromData } from "./Chain"
import { encodeWalletSignature } from "./SolidityData"
import { UserOperation, WalletSignature } from "./types"
import { Auth } from "../auth"
import { ENTRYPOINT_CONTRACT_INTERFACE } from "../common/constants"
import { EnvOption } from "../config"
import { calcPreVerificationGas } from "../utils"

export class UserOp {
    op: UserOperation

    constructor(op: UserOperation) {
        this.op = op
        this.op.preVerificationGas = op.preVerificationGas ? op.preVerificationGas : calcPreVerificationGas(this.op)
    }

    async sign(auth: Auth, chain: Chain) {
        const opHash = await this.getOpHashData(chain)
        const walletSignature: WalletSignature = {
            signature: (await auth.signHash(opHash)) as Hex,
            userId: (await auth.getAddress()) as Hex
        }
        this.op.signature = encodeWalletSignature(walletSignature)
    }

    async getOpHashData(chain: Chain) {
        const entryPointAddress = await chain.getAddress("entryPointAddress")
        return await ENTRYPOINT_CONTRACT_INTERFACE.readFromChain(entryPointAddress, "getUserOpHash", [this.op], chain)
    }

    getMaxTxCost() {
        const { maxFeePerGas, preVerificationGas, callGasLimit, verificationGasLimit } = this.op
        const mul: number = this.op.paymasterAndData !== "0x" ? 3 : 1
        const requiredGas = callGasLimit + verificationGasLimit * BigInt(mul) + preVerificationGas! ? preVerificationGas : 0n
        return maxFeePerGas * requiredGas!
    }

    async estimateGas(auth: Auth, option: EnvOption = (globalThis as any).globalEnvOption): Promise<UserOp> {
        if (!this.op.signature || this.op.signature === "0x") {
            this.op.signature = await auth.getEstimateGasSignature()
        }
        const chain = await getChainFromData(option.chain)
        const res = await chain.estimateOpGas({
            ...this.op,
            paymasterAndData: "0x",
            maxFeePerGas: 0n,
            maxPriorityFeePerGas: 0n,
            preVerificationGas: 0n,
            callGasLimit: 0n,
            verificationGasLimit: BigInt(10e6)
        })

        this.op.preVerificationGas = res.preVerificationGas
        this.op.verificationGasLimit = res.verificationGasLimit
        this.op.callGasLimit = res.callGasLimit

        return this
    }
}
