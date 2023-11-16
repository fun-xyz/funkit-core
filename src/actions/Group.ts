import { pad } from "viem"
import { CreateGroupParams, RemoveGroupParams, UpdateGroupParams } from "./types"
import { TransactionParams, USER_AUTHENTICATION_CONTRACT_INTERFACE } from "../common"
import { GlobalEnvOption } from "../config"
import { Chain } from "../data"

export const createGroupTxParams = async (params: CreateGroupParams, txOptions: GlobalEnvOption): Promise<TransactionParams> => {
    const { groupId, group } = params
    group.userIds = group.userIds.map((userId) => {
        return pad(userId, { size: 32 })
    })
    const chain = await Chain.getChain({ chainIdentifier: txOptions.chain }, txOptions.apiKey)
    const userAuthAddress = chain.getAddress("userAuthAddress")
    return USER_AUTHENTICATION_CONTRACT_INTERFACE.encodeTransactionParams(userAuthAddress, "createMultiSigGroup", [
        pad(groupId, { size: 32 }),
        group
    ])
}

export const updateGroupTxParams = async (params: UpdateGroupParams, txOptions: GlobalEnvOption): Promise<TransactionParams> => {
    const { groupId, group } = params
    group.userIds = group.userIds
        .map((userId) => {
            return pad(userId, { size: 32 })
        })
        .sort((a, b) => b.localeCompare(a))
    const chain = await Chain.getChain({ chainIdentifier: txOptions.chain }, txOptions.apiKey)
    const userAuthAddress = chain.getAddress("userAuthAddress")
    return USER_AUTHENTICATION_CONTRACT_INTERFACE.encodeTransactionParams(userAuthAddress, "updateMultiSigGroup", [
        pad(groupId, { size: 32 }),
        group
    ])
}

export const removeGroupTxParams = async (params: RemoveGroupParams, txOptions: GlobalEnvOption): Promise<TransactionParams> => {
    const { groupId } = params
    const chain = await Chain.getChain({ chainIdentifier: txOptions.chain }, txOptions.apiKey)
    const userAuthAddress = chain.getAddress("userAuthAddress")
    return USER_AUTHENTICATION_CONTRACT_INTERFACE.encodeTransactionParams(userAuthAddress, "deleteMultiSigGroup", [
        pad(groupId, { size: 32 })
    ])
}
