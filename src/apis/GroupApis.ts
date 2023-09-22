import { Address, Hex } from "viem"
import { GroupMetadata } from "./types"
import { API_URL } from "../common/constants"
import { sendPostRequest } from "../utils/ApiUtils"

export async function getGroups(groupIds: Hex[], chainId: string): Promise<GroupMetadata[]> {
    return (
        await sendPostRequest(API_URL, "group/get-groups", {
            groupIds,
            chainId
        })
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
