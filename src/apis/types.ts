import { Address, Hex } from "viem"
import { UserOperation } from "../data"
import { GroupInfo } from "../wallet"

export type Wallet = {
    walletUniqueId?: string
    walletAddr: Address
    userIds: Hex[]
}

export type GroupMetadata = {
    groupId: Hex
    chainId: string
    threshold: number
    walletAddr: Address
    memberIds: Hex[]
}

export type UpdateGroupMetadata = {
    threshold?: number
    memberIds?: Hex[]
}

export type ExecuteOpInput = {
    opId: Hex
    chainId: string
    executedBy: string
    entryPointAddress: Address
    signature: Hex
    userOp?: UserOperation
    groupInfo?: GroupInfo
}

export type ScheduleOpInput = {
    opId: Hex
    chainId: string
    scheduledBy: string
    entryPointAddress: Address
    signature: Hex
    userOp?: UserOperation
    groupInfo?: GroupInfo
}

export type EstimateOpInput = {
    opId?: Hex
    chainId: string
    entryPointAddress?: Address
    signature?: Hex
    userOp?: UserOperation
}

export type EstimatedGas = {
    preVerificationGas: bigint
    callGasLimit: bigint
    verificationGasLimit: bigint
}

export type GasPrice = {
    maxFeePerGas: bigint
    maxPriorityFeePerGas: bigint
}
