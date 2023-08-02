import { Address, Hex } from "viem"
import { Chain } from "../data"
type BigIntIsh = bigint | number | string | undefined
export type TransactionParams = {
    to: Address
    value?: BigIntIsh
    data?: Hex
}

export interface TransactionData extends TransactionParams {
    chain?: Chain
}

export interface TransactionDataWithFee extends TransactionData {
    token?: string
    amount?: BigIntIsh
    gasPercent?: BigIntIsh
    recipient?: Address
    oracle?: Address
}
export interface ExecutionReceipt {
    userOpHash: string
    txId?: Hex
    gasUsed: bigint
    gasUSD: bigint
}

export type EstimateGasResult = {
    verificationGas?: bigint
    preVerificationGas: bigint
    verificationGasLimit: bigint
    callGasLimit: bigint
}
