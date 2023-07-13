import { Address } from "viem"
import { Auth } from "../auth"
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
}
export interface NativeTransferParams extends TransferParam {
    amount: number
}

export interface ERC20TransferParams extends NativeTransferParams {
    token: Address
}

// Approval Param types
export type ApproveParam = {
    spender: string
    token: Address
}

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
}

export type ActionWhitelistObject = {
    abi: any
    functionWhitelist: string[]
}
