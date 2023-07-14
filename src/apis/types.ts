import { Address, Hex } from "viem"
import { AuthType, UserOperation } from "../data"

export type Wallet = {
    walletUniqueId?: string
    walletAddr: Address
    userIds: Hex[]
}

export type Group = {
    groupId: Hex
    chainId: string
    threshold: number
    walletAddr: Address
    memberIds: Hex[]
}

export type Operation = {
    opId: Hex
    chainId: string
    opType: OperationType
    authType: AuthType
    groupId?: Hex
    message?: string
    walletAddr: Address
    userOp: UserOperation
    status?: OperationStatus
    proposer: string // do not use address in case we later use non-address data as the proposer
    proposedTime: number
    executedBy?: string
    executedTime?: number
    relatedOpId?: Hex[]
    signatured: Signature[]
    txid?: string
}

export type Signature = {
    userId: Hex
    signature: Hex
    signedTime: number
}

export enum OperationStatus {
    PENDING_APPROVED = "PENDING_APPROVED",
    APPROVED = "APPROVED",
    CANCELLED = "CANCELLED",
    PENDING = "PENDING",
    OP_SUCCEED = "OP_SUCCEED",
    OP_REVERTED = "OP_REVERTED"
}

export enum OperationType {
    SINGLE_OPERATION = "SINGLE_OPERATION",
    GROUP_OPERATION = "GROUP_OPERATION",
    REJECTION = "REJECTION"
}
