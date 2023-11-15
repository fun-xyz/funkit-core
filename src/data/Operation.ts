import { Address, Hex } from "viem"
import { Chain } from "./Chain"
import { AuthType, OperationMetadata, OperationStatus, OperationType, Signature, UserOperation } from "./types"
import { Auth } from "../auth"
import { ENTRYPOINT_CONTRACT_INTERFACE } from "../common/constants"
import { calcPreVerificationGas } from "../utils"

export class Operation {
    opId?: Hex
    chainId: string
    opType: OperationType
    authType: AuthType
    groupId?: Hex
    message?: string
    walletAddr: Address
    userOp: UserOperation
    status?: OperationStatus
    proposer: string // do not use address in case we later use non-address data as the proposer
    proposedTime?: number
    executedBy?: string
    executedTime?: number
    relatedOpIds?: Hex[]
    signatures?: Signature[]
    txid?: string
    gasUsed?: string
    opFeeUSD?: string
    opFee?: string
    executedBlockNumber?: number
    executedBlockTimeStamp?: number
    chain: Chain

    constructor(userOp: UserOperation, metadata: OperationMetadata, chain: Chain) {
        this.userOp = userOp
        this.userOp.preVerificationGas = userOp.preVerificationGas ? userOp.preVerificationGas : calcPreVerificationGas(this.userOp)
        this.opId = metadata.opId
        this.chainId = metadata.chainId
        this.opType = metadata.opType
        this.authType = metadata.authType
        this.groupId = metadata.groupId
        this.message = metadata.message
        this.walletAddr = metadata.walletAddr
        this.status = metadata.status
        this.proposer = metadata.proposer
        this.proposedTime = metadata.proposedTime
        this.executedBy = metadata.executedBy
        this.executedTime = metadata.executedTime
        this.relatedOpIds = metadata.relatedOpIds
        this.signatures = metadata.signatures
        this.txid = metadata.txid
        this.gasUsed = metadata.gasUsed
        this.opFeeUSD = metadata.opFeeUSD
        this.opFee = metadata.opFee
        this.executedBlockNumber = metadata.executedBlockNumber
        this.executedBlockTimeStamp = metadata.executedBlockTimeStamp
        this.chain = chain
    }

    static convertTypeToObject(op: Operation, chain: Chain): Operation {
        return new Operation(
            op.userOp,
            {
                ...op
            },
            chain
        )
    }

    async getOpHash(chain: Chain): Promise<Hex> {
        const entryPointAddress = chain.getAddress("entryPointAddress")
        return await ENTRYPOINT_CONTRACT_INTERFACE.readFromChain(entryPointAddress, "getUserOpHash", [this.userOp], chain)
    }

    getMaxTxCost(): bigint {
        const { maxFeePerGas, preVerificationGas, callGasLimit, verificationGasLimit } = this.userOp

        const mul: bigint = this.userOp.paymasterAndData !== "0x" ? 3n : 1n
        const additionalGas = preVerificationGas ? preVerificationGas : 0n
        const requiredGas: bigint = callGasLimit + verificationGasLimit * mul + additionalGas

        return BigInt(maxFeePerGas) * requiredGas
    }

    async estimateGas(auth: Auth, userId: string): Promise<Operation> {
        if (!this.userOp.signature || this.userOp.signature === "0x") {
            this.userOp.signature = await auth.getEstimateGasSignature(userId, this)
        }
        const res = await this.chain.estimateOpGas({
            ...this.userOp,
            paymasterAndData: "0x",
            maxFeePerGas: 0n,
            maxPriorityFeePerGas: 0n,
            preVerificationGas: 0n,
            callGasLimit: 0n,
            verificationGasLimit: BigInt(10e6)
        })

        this.userOp.preVerificationGas = res.preVerificationGas
        this.userOp.verificationGasLimit = res.verificationGasLimit
        this.userOp.callGasLimit = res.callGasLimit

        return this
    }
}
