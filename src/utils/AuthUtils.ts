import { v4 as uuidv4 } from "uuid"
import { Address, Hex, decodeAbiParameters, pad } from "viem"
import { generatePrivateKey as generateRandomPrivateKey } from "viem/accounts"
import { createUser, getUserAuthIdByAddr, getUserUniqueId } from "../apis/UserApis"
import { ResourceNotFoundError } from "../errors"

export const getAuthUniqueId = async (authId: string, apiKey: string, addr = "NO_ADDRESS", skipDBActions = false) => {
    let authUniqueId
    if (skipDBActions) {
        authUniqueId = addr
    } else {
        authUniqueId = await getUserUniqueId(authId, apiKey)
    }
    if (!authUniqueId) {
        authUniqueId = uuidv4()
    }

    const words = authId.split("###")
    let method
    if (words[0].startsWith("0x")) {
        method = "eoa"
    } else {
        method = words[0]
    }
    await createUser(authId, addr, method, authUniqueId, apiKey)

    return authUniqueId
}

export const getAuthIdFromAddr = async (addr: Address, apiKey: string) => {
    let authId: string
    try {
        const [decodedAddr] = decodeAbiParameters([{ type: "address" }], pad(addr, { size: 32 }))
        authId = await getUserAuthIdByAddr(decodedAddr as string)
    } catch (err) {
        if (err instanceof ResourceNotFoundError) {
            authId = addr
            await createUser(addr, addr, "eoa", uuidv4(), apiKey)
        } else {
            throw err
        }
    }
    return authId
}

export const generatePrivateKey = (): Hex => {
    return generateRandomPrivateKey()
}
