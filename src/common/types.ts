import { BigNumber, BigNumberish } from "ethers"
import { Chain } from "../data"

export type TransactionParams = {
    to: string
    value?: BigNumberish
    data?: string
}

export interface TransactionData extends TransactionParams {
    chain?: Chain
}

export interface TransactionDataWithFee extends TransactionData {
    token?: string
    amount?: number
    gasPercent?: number
    recipient?: string
    oracle?: string
}
export interface ExecutionReceipt {
    opHash: string
    txid?: string
    gasUsed: number
    gasUSD: number
}

export type EstimateGasResult = {
    preVerificationGas: BigNumber
    verificationGasLimit: BigNumber
    callGasLimit: BigNumber
}
