import { pad } from "viem"
import { CreateGroupParams, RemoveGroupParams, UpdateGroupParams } from "./types"
import { TransactionParams, USER_AUTHENTICATION_CONTRACT_INTERFACE } from "../common"
import { EnvOption } from "../config"
import { Chain } from "../data"

export const createGroupTxParams = async (
    params: CreateGroupParams,
    txOptions: EnvOption = (globalThis as any).globalEnvOption
): Promise<TransactionParams> => {
    const { groupId, group } = params
    group.userIds = group.userIds.map((userId) => {
        return pad(userId, { size: 32 })
    })
    const chain = await Chain.getChain({ chainIdentifier: txOptions.chain })
    const userAuthAddress = await chain.getAddress("userAuthAddress")
    return USER_AUTHENTICATION_CONTRACT_INTERFACE.encodeTransactionParams(userAuthAddress, "createMultiSigGroup", [
        pad(groupId, { size: 32 }),
        group
    ])
}

export const updateGroupTxParams = async (
    params: UpdateGroupParams,
    txOptions: EnvOption = (globalThis as any).globalEnvOption
): Promise<TransactionParams> => {
    const { groupId, group } = params
    group.userIds = group.userIds
        .map((userId) => {
            return pad(userId, { size: 32 })
        })
        .sort((a, b) => b.localeCompare(a))
    const chain = await Chain.getChain({ chainIdentifier: txOptions.chain })
    const userAuthAddress = await chain.getAddress("userAuthAddress")
    return USER_AUTHENTICATION_CONTRACT_INTERFACE.encodeTransactionParams(userAuthAddress, "updateMultiSigGroup", [
        pad(groupId, { size: 32 }),
        group
    ])
}

export const removeGroupTxParams = async (
    params: RemoveGroupParams,
    txOptions: EnvOption = (globalThis as any).globalEnvOption
): Promise<TransactionParams> => {
    const { groupId } = params
    const chain = await Chain.getChain({ chainIdentifier: txOptions.chain })
    const userAuthAddress = await chain.getAddress("userAuthAddress")
    return USER_AUTHENTICATION_CONTRACT_INTERFACE.encodeTransactionParams(userAuthAddress, "deleteMultiSigGroup", [
        pad(groupId, { size: 32 })
    ])
}
