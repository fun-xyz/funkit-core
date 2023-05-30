import { calcPreVerificationGas } from "../utils/userop"
import { BigNumber, Contract } from "ethers"
import { Chain, getChainFromData } from "./Chain"
import { EnvOption } from "src/config/config"
import { Auth } from "../auth/Auth"

export interface UserOperation {
    sender: string
    nonce: BigNumber
    initCode: string
    callData: string
    callGasLimit: BigNumber
    verificationGasLimit: BigNumber
    preVerificationGas?: BigNumber
    maxFeePerGas: BigNumber
    maxPriorityFeePerGas: BigNumber
    paymasterAndData: string
    signature: string
}

export class UserOp {
    op: UserOperation

    constructor(
        sender: string,
        nonce: BigNumber,
        callData: string,
        callGasLimit: BigNumber,
        verificationGasLimit: BigNumber,
        maxFeePerGas: BigNumber,
        maxPriorityFeePerGas: BigNumber,
        initCode?: string,
        preVerificationGas?: BigNumber,
        paymasterAndData?: string,
        signature?: string
    ) {
        this.op = {
            sender,
            nonce,
            initCode: initCode ? initCode : "0x",
            callData,
            callGasLimit,
            verificationGasLimit,
            maxFeePerGas,
            maxPriorityFeePerGas,
            paymasterAndData: paymasterAndData ? paymasterAndData : "0x",
            signature: signature ? signature : "0x"
        }
        this.op.preVerificationGas = preVerificationGas ? preVerificationGas : calcPreVerificationGas(this.op)
    }

    async sign(auth: Auth, chain: Chain) {
        const opHash = await this.getOpHashData(chain)
        this.op.signature = await auth.signHash(opHash)
    }

    async getOpHashData(chain: Chain) {
        const entryPointAddress = await chain.getAddress("entryPointAddress")
        const provider = await chain.getProvider()
        const abi = require("../abis/EntryPoint.json").abi
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
