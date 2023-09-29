import { v4 as uuidv4 } from "uuid"
import { Hex } from "viem"
// @ts-ignore
// eslint-disable-next-line
import { generatePrivateKey as generateRandomPrivateKey } from "viem/accounts"
import { createUser, getUserUniqueId } from "../apis/UserApis"

export const getAuthUniqueId = async (authId: string, addr = "NO_ADDRESS", skipDBActions = false) => {
    let authUniqueId
    if (skipDBActions) {
        authUniqueId = addr
    } else {
        authUniqueId = await getUserUniqueId(authId)
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
    await createUser(authId, addr, method, authUniqueId)

    return authUniqueId
}

export const generatePrivateKey = (): Hex => {
    return generateRandomPrivateKey()
}
