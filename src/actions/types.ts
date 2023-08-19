import { Address, Hex } from "viem"
import { SessionKeyAuth } from "../auth"
import { TransactionParams } from "../common"

export interface ApproveAndExecParams {
    approve: ApproveERC20Params
    exec: TransactionParams
}

export interface ERC721TransferParams {
    tokenId: number
    collection: string
    from?: Address
    to: Address
}

export interface TokenTransferParams {
    token: string
    amount: number
    from?: Address
    to: Address
}

export type TransferParams = TokenTransferParams | ERC721TransferParams

// Approval Param types
export type ApproveParam = {
    spender: string
    token: Address
}
export type ApproveParams = ApproveERC20Params | ApproveERC721Params

export interface ApproveERC20Params extends ApproveParam {
    amount: number
}

export interface ApproveERC721Params extends ApproveParam {
    tokenId: number
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
export type CreateParams = {
    to: Address
}
export type SwapParams = {
    tokenIn: string
    tokenOut: string
    amount: number
    slippage?: number
    returnAddress?: Address
}

export type LimitOrderParam = {
    tokenIn: string
    tokenOut: string
    tokenInAmount: number
    tokenOutAmount: number
    poolFee?: number
}

export type SessionKeyParams = {
    targetWhitelist: string[]
    actionWhitelist: ActionWhitelistObject[]
    feeTokenWhitelist?: string[]
    feeRecipientWhitelist?: string[]
    deadline: bigint
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
