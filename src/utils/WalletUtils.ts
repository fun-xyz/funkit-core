import { v4 as uuidv4 } from "uuid"
import { Address, Hex, keccak256, pad, toBytes } from "viem"
import { randomBytes } from "./ChainUtils"
import { FACTORY_CONTRACT_INTERFACE } from "../common"
import { AuthType, Chain, Operation, Signature, UserOperation, encodeLoginData } from "../data"

export const generateRandomBytes32 = (): Hex => {
    return keccak256(toBytes(uuidv4())) as Hex
}

export const generateRandomWalletUniqueId = (): Hex => {
    return generateRandomBytes32()
}

export const generateRandomGroupId = (): Hex => {
    return generateRandomBytes32()
}

export const generateRoleId = (): Hex => {
    return generateRandomBytes32()
}

export const generateRuleId = (): Hex => {
    return generateRandomBytes32()
}

export const generateRandomNonceKey = (): bigint => {
    return BigInt(randomBytes(24))
}

export const generateRandomNonce = (): bigint => {
    const randomKey = generateRandomNonceKey()
    return randomKey << 64n
}

export const getWalletAddress = async (chain: Chain, walletUniqueId: Hex): Promise<Address> => {
    const data = encodeLoginData({ salt: walletUniqueId })
    const factoryAddress = await chain.getAddress("factoryAddress")
    return await FACTORY_CONTRACT_INTERFACE.readFromChain(factoryAddress, "getAddress", [data], chain)
}

export const isWalletInitOp = (userOp: UserOperation): boolean => {
    return userOp.initCode !== "0x"
}

export const isGroupOperation = (operation: Operation): boolean => {
    if (operation.groupId && operation.authType === AuthType.MULTI_SIG) {
        return true
    }
    return false
}

export const isSignatureMissing = (userId: Hex, signatures: Signature[] | undefined): boolean => {
    if (!signatures) {
        return true
    }
    let sigMissing = true
    for (const signature of signatures) {
        if (pad(signature.userId.toLowerCase() as Hex, { size: 32 }) === pad(userId.toLowerCase() as Hex, { size: 32 })) {
            sigMissing = false
            break
        }
    }
    return sigMissing
}
