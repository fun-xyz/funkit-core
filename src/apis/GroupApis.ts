import { Address, Hex } from "viem"
import { GroupMetadata, UpdateGroupMetadata } from "./types"
import { API_URL } from "../common/constants"
import { sendDeleteRequest, sendPostRequest, sendPutRequest } from "../utils/ApiUtils"

export async function createGroup(
    groupId: Hex,
    chainId: string,
    threshold: number,
    walletAddr: Address,
    memberIds: Hex[],
    apiKey: string
): Promise<void> {
    memberIds = memberIds.sort((a, b) => (a > b ? -1 : 1))
    await sendPostRequest(
        API_URL,
        "group",
        {
            groupId,
            chainId,
            threshold,
            walletAddr,
            memberIds
        },
        apiKey
    )
}

export async function getGroups(groupIds: Hex[], chainId: string, apiKey: string): Promise<GroupMetadata[]> {
    return (
        await sendPostRequest(
            API_URL,
            "group/get-groups",
            {
                groupIds,
                chainId
            },
            apiKey
        )
    ).groups
}

export async function getGroupsByWallet(walletAddr: Address, chainId: string): Promise<GroupMetadata[]> {
    return (
        await sendPostRequest(API_URL, `group/wallet/${walletAddr}/chain/${chainId}`, {
            walletAddr,
            chainId
        })
    ).groups
}

export async function updateGroupThreshold(groupId: Hex, chainId: string, threshold: number): Promise<void> {
    await sendPutRequest(API_URL, `group/${groupId}/chain/${chainId}/threshold`, {
        threshold
    })
}

export async function updateGroup(groupId: Hex, chainId: string, updateGroupMetadata: UpdateGroupMetadata, apiKey: string): Promise<void> {
    await sendPutRequest(API_URL, `group/${groupId}/chain/${chainId}`, updateGroupMetadata, apiKey)
}

export async function deleteGroup(groupId: Hex, chainId: string, apiKey: string): Promise<void> {
    await sendDeleteRequest(API_URL, `group/${groupId}/chain/${chainId}`, apiKey)
}
