import { Address, Hex } from "viem"
import { TransactionParams } from "../common"
import { Chain } from "../data"

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

export enum UniswapPoolFeeOptions {
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
    poolFee?: UniswapPoolFeeOptions
}

export type LimitOrderParam = {
    tokenIn: string
    tokenOut: string
    tokenInAmount: number
    tokenOutAmount: number
    poolFee?: UniswapPoolFeeOptions
}

export type SessionKeyParams = {
    targetWhitelist: string[]
    actionWhitelist: ActionWhitelistObject[]
    feeTokenWhitelist?: string[]
    feeRecipientWhitelist?: string[]
    deadline: number
    actionValueLimit?: bigint
    feeValueLimit?: bigint
    ruleId: Hex // 32 bytes
    roleId: Hex // 32 bytes
    userId?: Hex // 32 bytes
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

export type OneInchSwapParams = {
    src: Address // token address or 0xeee...eee for ETH
    dst: Address // token address or 0xeee...eee for ETH
    amount: string // amount of src tokens to swap (in wei)
    from: Address // wallet address
    slippage: number // Maximum acceptable slippage percentage for the swap (e.g., 1 for 1%)
    disableEstimate: boolean // Set to true to disable estimation of swap details
    allowPartialFill: boolean // Set to true to allow partial filling of the swap order
    chainId: string | Chain | number // Chain ID of the blockchain to use (e.g., 1 for Ethereum Mainnet)
}

export type BridgeParams = {
    fromChain: string | Chain | number
    toChain: string | Chain | number
    fromToken: string
    toToken: string
    amount: number
    sort?: SocketSort
    recipient?: Address
}
export enum SocketSort {
    output = "output",
    gas = "gas",
    time = "time"
}
