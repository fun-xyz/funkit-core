import { TransactionData, TransactionParams } from "../common"
import { EnvOption } from "../config"
import { Chain } from "../data"
import { ErrorData } from "../errors/"
import { FunWallet } from "../wallet"

export interface ApproveAndExecParams {
    approve: TransactionParams
    exec: TransactionParams
}

export interface ActionData {
    wallet: FunWallet
    chain: Chain
    options: EnvOption
}

// Transfer Param types
export type TransferParam = {
    to: string
}

export type TransferParams = ERC20TransferParams | ERC721TransferParams | NativeTransferParams

export interface ERC721TransferParams extends TransferParam {
    tokenId: number
    token: string
}
export interface NativeTransferParams extends TransferParam {
    amount: number
}

export interface ERC20TransferParams extends NativeTransferParams {
    token: string
}

// Approval Param types
export type ApproveParam = {
    spender: string
    token: string
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
    recipient?: string
}

export type FinishUnstakeParams = {
    recipient: string
}

export enum UniSwapPoolFeeOptions {
    lowest = "lowest",
    low = "low",
    medium = "medium",
    high = "high"
}

export type SwapParam = {
    in: string
    out: string
    amount: number
    slippage?: number
    returnAddress?: string
}

export interface OneInchSwapParams extends SwapParam {
    disableEstimate?: boolean
    allowPartialFill?: boolean
}

export type OneInchSwapReturn = {
    approveTx?: TransactionData
    swapTx: TransactionData
}

export interface UniswapParams extends SwapParam {
    poolFee?: UniSwapPoolFeeOptions
    percentDecimal?: number
}

export type SwapParams = OneInchSwapParams | UniswapParams

export type FirstClassActionResult = {
    data: TransactionData
    errorData: ErrorData
}

export type ActionFunction = (obj: any) => Promise<FirstClassActionResult>
