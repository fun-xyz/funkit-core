import { Address, Hex, WalletClient } from "viem"

export interface EoaAuthInput {
    client?: WalletClient
    privateKey?: Hex
    windowEth?: any
    rpc?: string
    provider?: any
}

export interface GroupAuthInput {
    uniqueId?: string
    userIds?: string[]
    requiredSignatures?: number
}

export type WalletCallData = {
    target: Address
    value: bigint
    calldata: Hex
    feeInfo?: {
        token: Address
        recipient: Address
        amount: bigint
    }
}
