import { BigNumber, Contract } from "ethers"
import { Chain, getChainFromData } from "./Chain"
import { encodeWalletSignature } from "./SolidityData"
import { UserOperation, WalletSignature } from "./types"
import { Auth } from "../auth/Auth"
import { ENTRYPOINT_ABI } from "../common/constants"
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
            signature: await auth.signHash(opHash),
            userId: await auth.getUniqueId()
        }
        this.op.signature = encodeWalletSignature(walletSignature)
    }

    async getOpHashData(chain: Chain) {
        const entryPointAddress = await chain.getAddress("entryPointAddress")
        const provider = await chain.getProvider()
        const contract = new Contract(entryPointAddress, ENTRYPOINT_ABI, provider)
        return await contract.getUserOpHash(this.op)
    }

    getMaxTxCost() {
        let { maxFeePerGas, preVerificationGas, callGasLimit, verificationGasLimit } = this.op
        const mul = this.op.paymasterAndData !== "0x" ? 3 : 1
        maxFeePerGas = BigNumber.from(maxFeePerGas)
        preVerificationGas = BigNumber.from(preVerificationGas)
        callGasLimit = BigNumber.from(callGasLimit)
        verificationGasLimit = BigNumber.from(verificationGasLimit)
        const requiredGas = callGasLimit.add(verificationGasLimit.mul(mul)).add(preVerificationGas!)
        return maxFeePerGas.mul(requiredGas)
    }

    async estimateGas(auth: Auth, option: EnvOption = (globalThis as any).globalEnvOption): Promise<UserOp> {
        if (!this.op.signature || this.op.signature === "0x") {
            this.op.signature = await auth.getEstimateGasSignature()
        }
        const chain = await getChainFromData(option.chain)
        const res = await chain.estimateOpGas({
            ...this.op,
            paymasterAndData: "0x",
            maxFeePerGas: BigNumber.from(0),
            maxPriorityFeePerGas: BigNumber.from(0),
            preVerificationGas: BigNumber.from(0),
            callGasLimit: BigNumber.from(0),
            verificationGasLimit: BigNumber.from(10e6)
        })

        this.op.preVerificationGas = res.preVerificationGas
        this.op.verificationGasLimit = res.verificationGasLimit
        this.op.callGasLimit = res.callGasLimit

        return this
    }
}
