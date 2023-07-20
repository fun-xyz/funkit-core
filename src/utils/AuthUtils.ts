import { v4 as uuidv4 } from "uuid"
import { Address } from "viem"
import { getAuth, setAuth } from "../apis"
import { createUser, getUserAuthIdByAddr, getUserUniqueId } from "../apis/UserApis"
import { ServerMissingDataError } from "../errors"

export const getStoredUniqueId = async (authId: string) => {
    const auth = await getAuth(authId)
    return auth.data ? auth.data.uniqueId : null
}

export const setStoredUniqueId = async (authId: string, uniqueId: string, addr = "") => {
    const words = authId.split("###")
    let method
    if (words[0].startsWith("0x")) {
        method = "eoa"
    } else {
        method = words[0]
    }
    await setAuth(authId, method, addr, uniqueId)
}

export const getUniqueId = async (authId: string, addr = "NO_ADDRESS") => {
    let uniqueId
    const storedUniqueId = await getStoredUniqueId(authId)
    if (storedUniqueId) {
        uniqueId = storedUniqueId
    } else {
        uniqueId = uuidv4()
        await setStoredUniqueId(authId, uniqueId, addr)
    }
    return uniqueId
}

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
        authId = await getUserAuthIdByAddr(addr, chainId)
    } catch (err) {
        if (err instanceof ServerMissingDataError) {
            authId = addr
            await createUser(addr, chainId, addr, "eoa", uuidv4())
        } else {
            throw err
        }
    }
    return authId
}
