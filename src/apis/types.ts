import { Address, Hex } from "viem"
import { UserOperation } from "../data"

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
