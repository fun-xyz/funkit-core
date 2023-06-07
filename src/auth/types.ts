import { Account, Hex, WalletClient } from "viem"

export interface EoaAuthInput {
    signerClient?: Account
    privateKey?: Hex
    client?: WalletClient
}

export interface GroupAuthInput {
    uniqueId?: string
    userIds?: string[]
    requiredSignatures?: number
}
