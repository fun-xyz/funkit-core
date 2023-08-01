import { getRandomValues } from "node:crypto"
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

export const generateRandomNonceKey = (): bigint => {
    // Step 1: Determine the number of bytes required (25 bytes for 2^192)
    const bytesNeeded = 24

    // Step 2: Generate 25 random bytes
    const randomBytes = new Uint8Array(bytesNeeded)
    getRandomValues(randomBytes)

    // Step 3: Convert the random bytes to a decimal number
    let randomDecimal = 0n
    for (let i = 0; i < bytesNeeded; i++) {
        randomDecimal += BigInt(randomBytes[i]) << BigInt(8 * (bytesNeeded - 1 - i))
    }

    return randomDecimal
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

export const isSignatureRequired = (userId: Hex, signatures: Signature[] | undefined): boolean => {
    if (!signatures) {
        return true
    }
    let sigRequired = true
    for (const signature of signatures) {
        if (pad(signature.userId, { size: 32 }) === userId) {
            sigRequired = false
            break
        }
    }
    return sigRequired
}
