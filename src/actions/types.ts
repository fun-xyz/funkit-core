import { Address, Hex } from "viem"
import { Auth, SessionKeyAuth } from "../auth"
import { TransactionData, TransactionParams } from "../common"
import { EnvOption } from "../config"
import { Chain } from "../data"
import { ErrorData } from "../errors/"
import { FunWallet } from "../wallet"

export interface ApproveAndExecParams {
    approve: ApproveERC20Params
    exec: TransactionParams
    chainId: number
}

export interface ActionData {
    wallet: FunWallet | Auth
    chain: Chain
    options: EnvOption
}

// Transfer Param types
export type TransferParam = {
    to: Address
}

export interface ERC721TransferParams extends TransferParam {
    tokenId: number
    token: Address
    from: Address
}
export interface NativeTransferParams extends TransferParam {
    amount: number
}

export interface ERC20TransferParams extends NativeTransferParams {
    token: Address
}

export type TransferParams = ERC20TransferParams | ERC721TransferParams | NativeTransferParams

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
    chainId: number
}

export type RequestUnstakeParams = {
    amounts: number[] // denominated in ETH
    recipient: string
    chainId: number
}

export type FinishUnstakeParams = {
    recipient: string
    chainId: number
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
export type SwapParam = {
    in: string
    out: string
    amount: number
    slippage?: number
    returnAddress: Address
    chainId: number
}

export interface OneInchSwapParams extends SwapParam {
    disableEstimate?: boolean
    allowPartialFill?: boolean
}

export interface UniswapParams extends SwapParam {
    poolFee?: UniSwapPoolFeeOptions
    percentDecimal?: number
}

export type ActionResult = {
    data: TransactionData
    errorData: ErrorData
}

export type ActionFunction = (obj: ActionData) => Promise<ActionResult>

export type SessionKeyParams = {
    targetWhitelist: string[]
    actionWhitelist: ActionWhitelistObject[]
    feeTokenWhitelist?: string[]
    feeRecipientWhitelist?: string[]
    deadline: bigint
    actionValueLimit?: bigint
    feeValueLimit?: bigint
    user: SessionKeyAuth
    chainId: number
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
    chainId: number
}

export type RemoveOwnerParams = {
    ownerId: Hex
    chainId: number
}

export type CreateGroupParams = {
    groupId: Hex
    group: Group
    chainId: number
}

export type AddUserToGroupParams = {
    groupId: Hex
    userId: Hex
    chainId: number
}

export type RemoveUserFromGroupParams = {
    groupId: Hex
    userId: Hex
    chainId: number
}

export type UpdateThresholdOfGroupParams = {
    groupId: Hex
    threshold: number
    chainId: number
}

export type UpdateGroupParams = {
    groupId: Hex
    group: Group
    chainId: number
}

export type RemoveGroupParams = {
    groupId: Hex
    chainId: number
}

export type CommitParams = {
    socialHandle: Hex
    index: bigint
    seed: Hex
    owner: Address
    initializerCallData: Hex
    walletInitAddress: Address
}
