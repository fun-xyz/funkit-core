import { Chain } from "../data"

export interface EnvOption {
    chain?: Chain
    gasSponsor?: {
        sponsorAddress?: string
        token?: string
    }
    fee?: {
        token?: string
        amount?: number
        gasPercent?: number
        recipient?: string
        oracle?: string
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
