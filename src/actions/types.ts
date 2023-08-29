import { Hex } from "viem"
import { SessionKeyAuth } from "../auth"
import { TransactionParams } from "../common"

export interface ApproveAndExecParams {
    approve: ApproveERC20Params
    exec: TransactionParams
}

export interface ERC721TransferParams {
    tokenId: number
    collection: string
    from?: string
    to: string
}

export interface TokenTransferParams {
    token: string
    amount: number
    from?: string
    to: string
}

export type TransferParams = TokenTransferParams | ERC721TransferParams

// Approval Param types
export type ApproveParams = ApproveERC20Params | ApproveERC721Params

export interface ApproveERC20Params {
    spender: string
    amount: number
    token: string
}

export interface ApproveERC721Params {
    spender: string
    tokenId: number
    collection: string
}

export type StakeParams = {
    amount: number // denominated in ETH
}

export type RequestUnstakeParams = {
    amounts: number[] // denominated in ETH
    recipient: string
}

export type FinishUnstakeParams = {
    recipient: string
    walletAddress: string
}

export enum UniSwapPoolFeeOptions {
    lowest = "lowest",
    low = "low",
    medium = "medium",
    high = "high"
}

export type SwapParams = {
    tokenIn: string
    tokenOut: string
    inAmount: number
    slippage?: number
    recipient?: string
    poolFee?: UniSwapPoolFeeOptions
}

export type LimitOrderParam = {
    tokenIn: string
    tokenOut: string
    tokenInAmount: number
    tokenOutAmount: number
    poolFee?: UniSwapPoolFeeOptions
}

export type SessionKeyParams = {
    targetWhitelist: string[]
    actionWhitelist: ActionWhitelistObject[]
    feeTokenWhitelist?: string[]
    feeRecipientWhitelist?: string[]
    deadline: number
    actionValueLimit?: bigint
    feeValueLimit?: bigint
    user: SessionKeyAuth
}

export type ActionWhitelistObject = {
    abi: any
    functionWhitelist: string[]
}

export type RuleStruct = {
    deadline: bigint
    actionValueLimit: bigint
    targetSelectorMerkleRootHash: Hex
    feeValueLimit: bigint
    feeRecipientTokenMerkleRootHash: Hex
}

export type Group = {
    userIds: Hex[]
    threshold: number
}

export type AddOwnerParams = {
    ownerId: Hex
}

export type RemoveOwnerParams = {
    ownerId: Hex
}

export type CreateGroupParams = {
    groupId: Hex
    group: Group
}

export type AddUserToGroupParams = {
    groupId: Hex
    userId: Hex
}

export type RemoveUserFromGroupParams = {
    groupId: Hex
    userId: Hex
}

export type UpdateThresholdOfGroupParams = {
    groupId: Hex
    threshold: number
}

export type UpdateGroupParams = {
    groupId: Hex
    group: Group
}

export type RemoveGroupParams = {
    groupId: Hex
}
