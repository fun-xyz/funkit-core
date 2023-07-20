import { Address, Hex } from "viem"

export type Wallet = {
    walletUniqueId?: string
    walletAddr: Address
    userIds: Hex[]
}

export type GroupMetadata = {
    groupId: Hex
    chainId: string
    threshold: number
    walletAddr: Address
    memberIds: Hex[]
}

export type UpdateGroupMetadata = {
    threshold?: number
    memberIds?: Hex[]
}
