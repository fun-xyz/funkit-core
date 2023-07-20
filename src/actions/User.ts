import { Hex, pad } from "viem"
import { AddOwnerParams, CreateGroupParams, RemoveGroupParams, RemoveOwnerParams, UpdateGroupParams } from "./types"
import { RBAC_CONTRACT_INTERFACE, USER_AUTHENTICATION_CONTRACT_INTERFACE, WALLET_CONTRACT_INTERFACE } from "../common"
import { getChainFromData } from "../data"

export const addOwnerCalldata = async (params: AddOwnerParams): Promise<Hex> => {
    const { ownerId, chainId } = params
    const addOwnerData = RBAC_CONTRACT_INTERFACE.encodeData("addOwner", [pad(ownerId, { size: 32 })])
    const chain = await getChainFromData(chainId)
    const rbacAddress = await chain.getAddress("rbacAddress")
    return WALLET_CONTRACT_INTERFACE.encodeData("execFromEntryPoint", [rbacAddress, 0, addOwnerData])
}

export const removeOwnerCalldata = async (params: RemoveOwnerParams): Promise<Hex> => {
    const { ownerId, chainId } = params
    const removeOwnerData = RBAC_CONTRACT_INTERFACE.encodeData("removeOwner", [pad(ownerId, { size: 32 })])
    const chain = await getChainFromData(chainId)
    const rbacAddress = await chain.getAddress("rbacAddress")
    return WALLET_CONTRACT_INTERFACE.encodeData("execFromEntryPoint", [rbacAddress, 0, removeOwnerData])
}

export const createGroupCalldata = async (params: CreateGroupParams): Promise<Hex> => {
    const { groupId, group, chainId } = params
    group.userIds = group.userIds.map((userId) => {
        return pad(userId, { size: 32 })
    })
    const createGroupData = USER_AUTHENTICATION_CONTRACT_INTERFACE.encodeData("createMultiSigGroup", [pad(groupId, { size: 32 }), group])
    const chain = await getChainFromData(chainId)
    const userAuthAddress = await chain.getAddress("userAuthAddress")
    return WALLET_CONTRACT_INTERFACE.encodeData("execFromEntryPoint", [userAuthAddress, 0, createGroupData])
}

export const updateGroupCalldata = async (params: UpdateGroupParams): Promise<Hex> => {
    const { groupId, group, chainId } = params
    group.userIds = group.userIds
        .map((userId) => {
            return pad(userId, { size: 32 })
        })
        .sort((a, b) => b.localeCompare(a))
    const updateGroupData = USER_AUTHENTICATION_CONTRACT_INTERFACE.encodeData("updateMultiSigGroup", [pad(groupId, { size: 32 }), group])
    const chain = await getChainFromData(chainId)
    const userAuthAddress = await chain.getAddress("userAuthAddress")
    return WALLET_CONTRACT_INTERFACE.encodeData("execFromEntryPoint", [userAuthAddress, 0, updateGroupData])
}

export const removeGroupCalldata = async (params: RemoveGroupParams): Promise<Hex> => {
    const { groupId, chainId } = params
    const removeGroupData = USER_AUTHENTICATION_CONTRACT_INTERFACE.encodeData("deleteMultiSigGroup", [pad(groupId, { size: 32 })])
    const chain = await getChainFromData(chainId)
    const userAuthAddress = await chain.getAddress("userAuthAddress")
    return WALLET_CONTRACT_INTERFACE.encodeData("execFromEntryPoint", [userAuthAddress, 0, removeGroupData])
}
