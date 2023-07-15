import { v4 as uuidv4 } from "uuid"
import { Address, Hex, keccak256, toBytes } from "viem"
import { FACTORY_CONTRACT_INTERFACE } from "../common"
import { Chain, UserOperation, encodeLoginData } from "../data"

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

export const isGroupOperation = (authAddr: Hex, userId: string): boolean => {
    return authAddr !== (userId as Hex)
}
