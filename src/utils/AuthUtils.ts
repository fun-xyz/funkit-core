import { v4 as uuidv4 } from "uuid"
import { Address, decodeAbiParameters } from "viem"
import { createUser, getUserAuthIdByAddr, getUserUniqueId } from "../apis/UserApis"
import { ResourceNotFoundError } from "../errors"

export const getAuthUniqueId = async (authId: string, chainId: string, addr = "NO_ADDRESS", skipDBActions = false) => {
    let authUniqueId
    if (skipDBActions) {
        authUniqueId = addr
    } else {
        authUniqueId = await getUserUniqueId(authId)
    }
    if (!authUniqueId) {
        authUniqueId = uuidv4()

        const words = authId.split("###")
        let method
        if (words[0].startsWith("0x")) {
            method = "eoa"
        } else {
            method = words[0]
        }
        await createUser(authId, chainId, addr, method, authUniqueId)
    }

    return authUniqueId
}

export const getAuthIdFromAddr = async (addr: Address, chainId: string) => {
    let authId: string
    try {
        const [decodedAddr] = decodeAbiParameters([{ type: "address" }], addr)
        authId = await getUserAuthIdByAddr(decodedAddr as string, chainId)
    } catch (err) {
        if (err instanceof ResourceNotFoundError) {
            authId = addr
            await createUser(addr, chainId, addr, "eoa", uuidv4())
        } else {
            throw err
        }
    }
    return authId
}
