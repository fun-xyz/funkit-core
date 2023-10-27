import { Address } from "viem"

export interface EnvOption {
    gasSponsor?: {
        sponsorAddress?: Address
        token?: string
        usePermit?: boolean
    }
    fee?: {
        token?: string
        amount?: number
        gasPercent?: number // 4% -> 4, 100% -> 100
        recipient: Address
    }
    skipDBAction?: boolean
    nonce?: bigint
}

export interface GlobalEnvOption extends EnvOption {
    apiKey?: string
}
