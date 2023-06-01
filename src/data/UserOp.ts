import { calcPreVerificationGas } from "../utils"
import { BigNumber, Contract } from "ethers"
import { Chain, getChainFromData } from "./Chain"
import { EnvOption } from "src/config/config"
import { Auth } from "../auth/Auth"
import { ENTRYPOINT_ABI } from "../common/constants"
import { encodeWalletSignature, WalletSignature } from "./SolidityData"

export interface UserOperation {
    sender: string
    nonce: BigNumber
    initCode?: string | "0x"
    callData: string
    callGasLimit: BigNumber
    verificationGasLimit: BigNumber
    preVerificationGas?: BigNumber
    maxFeePerGas: BigNumber
    maxPriorityFeePerGas: BigNumber
    paymasterAndData?: string | "0x"
    signature?: string | "0x"
}

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
        const abi = ENTRYPOINT_ABI.abi
        const contract = new Contract(entryPointAddress, abi, provider)
        return await contract.getUserOpHash(this.op)
    }

    getMaxTxCost() {
        const { maxFeePerGas, preVerificationGas, callGasLimit, verificationGasLimit } = this.op
        const mul = this.op.paymasterAndData != "0x" ? 3 : 1
        const requiredGas = callGasLimit.add(verificationGasLimit.mul(mul)).add(preVerificationGas!)
        return maxFeePerGas.mul(requiredGas)
    }

    async estimateGas(auth: Auth, option: EnvOption = (globalThis as any).globalEnvOption): Promise<UserOp> {
        if (!this.op.signature || this.op.signature == "0x") {
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
