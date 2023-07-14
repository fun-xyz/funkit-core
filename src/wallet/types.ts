import { Hex } from "viem"

export type GroupInfo = {
    memberIds: Hex[]
    threshold: number
}

export type User = {
    userId: Hex
    groupInfo?: GroupInfo
}
