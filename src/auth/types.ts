import { Hex } from "viem"

export interface EoaAuthInput {
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
