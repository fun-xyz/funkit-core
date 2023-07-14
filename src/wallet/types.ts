import { Address, Hex } from "viem"

export type GroupInfo = {
    memberIds: Hex[]
    threshold: number
}

export type User = {
    userId: string
    groupInfo?: GroupInfo
}

export interface FunWalletParams {
    users?: User[]
    uniqueId?: string
    walletAddr?: Address
}
