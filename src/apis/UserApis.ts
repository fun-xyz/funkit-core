import { Address, Hex } from "viem"
import { Wallet } from "./types"
import { API_URL } from "../common/constants"
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
    return (await sendGetRequest(API_URL, `user/${authId}/unique-id`)).userUniqueId
}

export async function getUserWallets(authId: string, chainId: string): Promise<Wallet[]> {
    return (await sendGetRequest(API_URL, `user/${authId}/chain/${chainId}/wallets`)).wallets
}

export async function addUserToWallet(
    authId: string,
    chainId: string,
    walletAddr: Address,
    userIds: Hex[],
    walletUniqueId?: string
): Promise<void> {
    await sendPostRequest(API_URL, `user/${authId}/chain/${chainId}/wallets`, {
        walletAddr,
        userIds,
        walletUniqueId
    })
}

export async function removeUserWallet(authId: string, chainId: string, walletAddr: Address): Promise<void> {
    await sendDeleteRequest(API_URL, `user/${authId}/chain/${chainId}/wallet/${walletAddr}`)
}

// return userIds of the specificed Wallet.
export async function getUserWalletIdentities(authId: string, chainId: string, walletAddr: Address): Promise<Hex[]> {
    return (await sendGetRequest(API_URL, `user/${authId}/chain/${chainId}/wallet/${walletAddr}/identities`)).ids
}

export async function addUserToGroup(authId: string, chainId: string, walletAddr: Address, groupId: Hex): Promise<void> {
    await sendPostRequest(API_URL, `user/${authId}/chain/${chainId}/wallet/${walletAddr}/group`, {
        groupId
    })
}

export async function removeUserFromGroup(authId: string, chainId: string, walletAddr: Address, groupId: Hex): Promise<void> {
    await sendDeleteRequest(API_URL, `user/${authId}/chain/${chainId}/wallet/${walletAddr}/group/${groupId}`)
}
