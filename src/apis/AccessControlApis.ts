import { Address, Hex } from "viem"
import { API_URL } from "../common/constants"
import { sendGetRequest, sendPostRequest } from "../utils/ApiUtils"

export async function initializeWalletAccess(walletAddr: Address, creatorAddr: Address, apiKey: string): Promise<void> {
    await sendPostRequest(API_URL, "access/wallet", { walletAddr, creatorAddr }, apiKey)
}

export async function checkWalletAccessInitialization(walletAddr: Address, apiKey: string): Promise<boolean> {
    return (await sendGetRequest(API_URL, `access/wallet/${walletAddr}`, apiKey)).initialized
}

export async function addAccessToWallet(walletAddr: Address, nonce: number, signature: Hex): Promise<void> {
    await sendPostRequest(API_URL, `access/wallet/${walletAddr}`, { nonce, signature })
}

export async function addAccessToUser(authId: string, nonce: number, signature: Hex): Promise<void> {
    await sendPostRequest(API_URL, `access/user/${authId}`, { nonce, signature })
}
