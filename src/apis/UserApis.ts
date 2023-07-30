import { Address, Hex, InvalidParameterError } from "viem"
import { Wallet } from "./types"
import { API_URL } from "../common/constants"
import { ResourceNotFoundError } from "../errors"
import { sendDeleteRequest, sendGetRequest, sendPostRequest } from "../utils/ApiUtils"

export async function createUser(authId: string, chainId: string, addr: string, method: string, userUniqueId: string): Promise<void> {
    await sendPostRequest(API_URL, "user", {
        authId,
        chainId,
        addr,
        method,
        userUniqueId
    })
}

export async function getUserUniqueId(authId: string): Promise<string> {
    try {
        return (await sendGetRequest(API_URL, `user/auth/${authId}/unique-id`)).userUniqueId
    } catch (err) {
        if (err instanceof ResourceNotFoundError) {
            return ""
        }
        throw err
    }
}

export async function getUserAddr(authId: string, chainId: string): Promise<string> {
    return (await sendGetRequest(API_URL, `user/auth/${authId}/chain/${chainId}/addr`)).addr
}

export async function getUserWalletsByAddr(addr: string, chainId: string): Promise<Wallet[]> {
    return (await sendGetRequest(API_URL, `user/addr/${addr}/chain/${chainId}/wallets`)).wallets
}

export async function getUserAuthIdByAddr(addr: string, chainId: string): Promise<string> {
    return (await sendGetRequest(API_URL, `user/addr/${addr}/chain/${chainId}/authId`)).authId
}

export async function addUserToWallet(
    authId: string,
    chainId: string,
    walletAddr: Address,
    userIds: Hex[],
    walletUniqueId?: string
): Promise<void> {
    try {
        await sendPostRequest(API_URL, `user/auth/${authId}/chain/${chainId}/wallet`, {
            walletAddr,
            userIds,
            walletUniqueId
        })
    } catch (err) {
        if (err instanceof InvalidParameterError) {
            // swallow the error if the wallet already exists.
            return
        }
    }
}

export async function removeUserWalletIdentity(authId: string, chainId: string, walletAddr: Address, userId: Hex): Promise<void> {
    await sendDeleteRequest(API_URL, `user/auth/${authId}/chain/${chainId}/wallet/${walletAddr}/identity/${userId}`)
}

// return userIds of the specificed Wallet.
export async function getUserWalletIdentities(authId: string, chainId: string, walletAddr: Address): Promise<Hex[]> {
    return (await sendGetRequest(API_URL, `user/auth/${authId}/chain/${chainId}/wallet/${walletAddr}/identities`)).ids
}

export async function addUserToGroup(authId: string, chainId: string, walletAddr: Address, groupId: Hex): Promise<void> {
    await sendPostRequest(API_URL, `user/auth/${authId}/chain/${chainId}/wallet/${walletAddr}/group`, {
        groupId
    })
}

export async function removeUserFromGroup(authId: string, chainId: string, walletAddr: Address, groupId: Hex): Promise<void> {
    await sendDeleteRequest(API_URL, `user/auth/${authId}/chain/${chainId}/wallet/${walletAddr}/group/${groupId}`)
}
