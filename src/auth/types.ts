import { Web3Provider } from "@ethersproject/providers"
import { Signer } from "ethers"

export interface EoaAuthInput {
    signer?: Signer
    privateKey?: string
    provider?: Web3Provider
}

export interface GroupAuthInput {
    uniqueId?: string
    userIds?: string[]
    requiredSignatures?: number
}
