import { Address, Hex, InvalidParameterError } from "viem"
import { Wallet } from "./types"
import { API_URL } from "../common/constants"
import { ResourceNotFoundError } from "../errors"
import { sendGetRequest, sendPostRequest } from "../utils/ApiUtils"

export async function createUser(authId: string, addr: string, method: string, userUniqueId: string, apiKey: string): Promise<void> {
    await sendPostRequest(
        API_URL,
        "user",
        {
            authId,
            addr,
            method,
            userUniqueId
        },
        apiKey
    )
}

export async function getUserUniqueId(authId: string, apiKey: string): Promise<string> {
    try {
        return (await sendGetRequest(API_URL, `user/auth/${authId}/unique-id`, apiKey)).userUniqueId
    } catch (err) {
        if (err instanceof ResourceNotFoundError) {
            return ""
        }
        throw err
    }
}

export async function getUserAddr(authId: string): Promise<string> {
    return (await sendGetRequest(API_URL, `user/auth/${authId}/addr`)).addr
}

export async function getUserWalletsByAddr(addr: string, apiKey: string, chainId?: string): Promise<Wallet[]> {
    const endpoint = chainId ? `user/addr/${addr}/wallets?chainId=${chainId}` : `user/addr/${addr}/wallets`
    return (await sendGetRequest(API_URL, endpoint, apiKey)).wallets
}

export async function getUserAuthIdByAddr(addr: string, apiKey: string): Promise<string> {
    return (await sendGetRequest(API_URL, `user/addr/${addr}/authId`, apiKey)).authId
}

export async function addUserToWallet(
    authId: string,
    chainId: string,
    walletAddr: Address,
    userIds: Hex[],
    apiKey: string,
    walletUniqueId?: string
): Promise<void> {
    try {
        await sendPostRequest(
            API_URL,
            `user/auth/${authId}/chain/${chainId}/wallet`,
            {
                walletAddr,
                userIds,
                walletUniqueId
            },
            apiKey
        )
    } catch (err) {
        if (err instanceof InvalidParameterError) {
            // swallow the error if the wallet already exists.
            return
        }
        throw err
    }
}

// return userIds of the specificed Wallet.
export async function getUserWalletIdentities(authId: string, chainId: string, walletAddr: Address, apiKey: string): Promise<Hex[]> {
    return (await sendGetRequest(API_URL, `user/auth/${authId}/chain/${chainId}/wallet/${walletAddr}/identities`, apiKey)).ids ?? []
}
