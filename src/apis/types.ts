import { Address, Hex } from "viem"

export type Wallet = {
    walletUniqueId?: string
    walletAddr: Address
    userIds: Hex[]
}

export type Group = {
    groupId: Hex
    chainId: string
    threshold: number
    walletAddr: Address
    memberIds: Hex[]
}
