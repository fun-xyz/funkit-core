import { Address, Hex, WalletClient } from "viem"

export interface AuthInput {
    web2AuthId?: string
    client?: WalletClient
    privateKey?: string
    windowEth?: any
    rpc?: string
    provider?: any
    signer?: any
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
