import { Address } from "viem"
import { Chain } from "../data"

export interface EnvOption {
    chain: string | Chain | number
    gasSponsor?: {
        sponsorAddress?: Address
        token?: string
        permitTokens?: number | bigint
    }
    fee?: {
        token?: string
        amount?: number
        gasPercent?: number
        recipient?: Address
        oracle?: Address
    }
    sendTxLater?: boolean
}

export interface GlobalEnvOption extends EnvOption {
    apiKey?: string
    orgInfo?: {
        name?: string
        id?: string
    }
}
