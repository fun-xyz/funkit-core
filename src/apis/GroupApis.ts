import { Address, Hex } from "viem"
import { Group } from "./types"
import { API_URL } from "../common/constants"
import { sendDeleteRequest, sendPostRequest } from "../utils/ApiUtils"

export async function createGroup(groupId: Hex, chainId: string, threshold: number, walletAddr: Address, memberIds: Hex[]): Promise<void> {
    await sendPostRequest(API_URL, "group", {
        groupId,
        chainId,
        threshold,
        walletAddr,
        memberIds
    })
}

export async function getGroups(groupIds: Hex[], chainId: string): Promise<Group[]> {
    return (
        await sendPostRequest(API_URL, "group/get-groups", {
            groupIds,
            chainId
        })
    ).groups
}

export async function getGroupsByWallet(walletAddr: Address, chainId: string): Promise<Group[]> {
    return (
        await sendPostRequest(API_URL, `group/wallet/${walletAddr}/chain/${chainId}`, {
            walletAddr,
            chainId
        })
    ).groups
}

export async function deleteGroup(groupId: Hex, chainId: string): Promise<void> {
    await sendDeleteRequest(API_URL, `group/${groupId}/chain/${chainId}`)
}
