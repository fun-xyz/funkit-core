import { Hex, WalletClient } from "viem"

export interface EoaAuthInput {
    web2AuthId?: string
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
