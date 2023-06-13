import { Hex, WalletClient } from "viem"

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
