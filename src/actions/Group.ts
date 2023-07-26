import { pad } from "viem"
import { CreateGroupParams, RemoveGroupParams, UpdateGroupParams } from "./types"
import { TransactionParams, USER_AUTHENTICATION_CONTRACT_INTERFACE } from "../common"
import { getChainFromData } from "../data"

export const createGroupTxParams = async (params: CreateGroupParams): Promise<TransactionParams> => {
    const { groupId, group, chainId } = params
    if (group.userIds.length < 3 || group.threshold < 2) {
        throw new Error("Group must have at least 3 users and threshold must be at least 2")
    }
    group.userIds = group.userIds.map((userId) => {
        return pad(userId, { size: 32 })
    })
    const chain = await getChainFromData(chainId)
    const userAuthAddress = await chain.getAddress("userAuthAddress")
    return USER_AUTHENTICATION_CONTRACT_INTERFACE.encodeTransactionParams(userAuthAddress, "createMultiSigGroup", [
        pad(groupId, { size: 32 }),
        group
    ])
}

export const updateGroupTxParams = async (params: UpdateGroupParams): Promise<TransactionParams> => {
    const { groupId, group, chainId } = params
    group.userIds = group.userIds
        .map((userId) => {
            return pad(userId, { size: 32 })
        })
        .sort((a, b) => b.localeCompare(a))
    const chain = await getChainFromData(chainId)
    const userAuthAddress = await chain.getAddress("userAuthAddress")
    return USER_AUTHENTICATION_CONTRACT_INTERFACE.encodeTransactionParams(userAuthAddress, "updateMultiSigGroup", [
        pad(groupId, { size: 32 }),
        group
    ])
}

export const removeGroupTxParams = async (params: RemoveGroupParams): Promise<TransactionParams> => {
    const { groupId, chainId } = params
    const chain = await getChainFromData(chainId)
    const userAuthAddress = await chain.getAddress("userAuthAddress")
    return USER_AUTHENTICATION_CONTRACT_INTERFACE.encodeTransactionParams(userAuthAddress, "deleteMultiSigGroup", [
        pad(groupId, { size: 32 })
    ])
}
