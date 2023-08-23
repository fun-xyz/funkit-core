import { Hex } from "viem"

export type GroupInfo = {
    threshold: number
    memberIds: Hex[]
}

export type User = {
    userId: Hex
    groupInfo?: GroupInfo
}

export interface FunWalletParams {
    users: User[]
    uniqueId: string
}
