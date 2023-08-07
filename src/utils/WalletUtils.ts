import { v4 as uuidv4 } from "uuid"
import { Address, Hex, keccak256, pad, toBytes } from "viem"
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

export const generateRandomNonce = (): bigint => {
    const generateRandomNumber = (min: number, max: number): number => {
        min = Math.ceil(min)
        max = Math.floor(max)
        return Math.floor(Math.random() * (max - min + 1)) + min
    }

    const randomKey = BigInt(generateRandomNumber(100, 1000))
    return BigInt(randomKey << 64n)
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
