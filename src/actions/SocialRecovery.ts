import { Address, Hex, keccak256, pad, toBytes } from "viem"
import { createFeeRecipientAndTokenMerkleTree, createTargetSelectorMerkleTree } from "./AccessControl"
import { SessionKeyParams } from "./types"
import { RBAC_CONTRACT_INTERFACE, TransactionParams, USER_AUTHENTICATION_ABI, USER_AUTHENTICATION_CONTRACT_INTERFACE } from "../common"
import { EnvOption } from "../config"
import { Chain } from "../data"

export const createRecoveryGroupTxParams = async (
    users: Address[],
    threshold: number,
    recoveryGroupId: string,
    txOptions: EnvOption = (globalThis as any).globalEnvOption
): Promise<TransactionParams> => {
    const chain = await Chain.getChain({ chainIdentifier: txOptions.chain })
    const userAuthAddress = await chain.getAddress("userAuthAddress")
    // Create a recovery group with recoveryGroupId
    const recoveryUserIds = users
        .map((address) => pad(address, { size: 32 }).toLowerCase() as Hex)
        .sort((a, b) => {
            return parseInt(b, 16) - parseInt(a, 16)
        })
    const recoveryGroup = {
        userIds: recoveryUserIds,
        threshold: threshold
    }
    return USER_AUTHENTICATION_CONTRACT_INTERFACE.encodeTransactionParams(userAuthAddress, "createMultiSigGroup", [
        recoveryGroupId,
        recoveryGroup
    ])
}

export const giveRecoveryGroupPermissionsTxParams = async (
    recoveryGroupId: string,
    txOptions: EnvOption = (globalThis as any).globalEnvOption
): Promise<TransactionParams[]> => {
    // give the recovery group the ability to call userauth.initiateRecovery and userAuth.finishRecovery
    const recoveryGroupRuleId: Hex = keccak256(toBytes("recoveryRoleRuleId"))
    const recoveryRoleId: Hex = keccak256(toBytes("recoveryRoleId"))
    const chain = await Chain.getChain({ chainIdentifier: txOptions.chain })
    const rbacAddress = await chain.getAddress("rbacAddress")
    const userAuthAddress = await chain.getAddress("userAuthAddress")
    const params: SessionKeyParams = {
        targetWhitelist: [userAuthAddress],
        actionWhitelist: [
            {
                abi: USER_AUTHENTICATION_ABI,
                functionWhitelist: ["initiateRecovery", "finishRecovery"]
            }
        ],
        feeTokenWhitelist: [],
        feeRecipientWhitelist: [],
        deadline: 0,
        ruleId: recoveryGroupRuleId,
        roleId: recoveryRoleId
    }
    const targetSelectorMerkleTree = createTargetSelectorMerkleTree(params)
    const feeRecipientAndTokenMerkleTree = await createFeeRecipientAndTokenMerkleTree(params)
    const rule = {
        deadline: 0,
        actionValueLimit: 0,
        targetSelectorMerkleRootHash: targetSelectorMerkleTree.getRootHash(),
        feeValueLimit: 0,
        feeRecipientTokenMerkleRootHash: feeRecipientAndTokenMerkleTree.getRootHash()
    }
    const setRule = RBAC_CONTRACT_INTERFACE.encodeTransactionParams(rbacAddress, "setRule", [recoveryGroupRuleId, rule])
    const addUserToRole = RBAC_CONTRACT_INTERFACE.encodeTransactionParams(rbacAddress, "addUserToRole", [recoveryRoleId, recoveryGroupId])
    const addRuleToRole = RBAC_CONTRACT_INTERFACE.encodeTransactionParams(rbacAddress, "addRuleToRole", [
        recoveryRoleId,
        recoveryGroupRuleId
    ])
    return [setRule, addUserToRole, addRuleToRole]
}

// export const initiateRecoveryTxParams = (params: TransactionParams[], walletAddress: Address): TransactionParams => {}

// export const executeRecoveryTxParams = (params: TransactionParams[], walletAddress: Address): TransactionParams => {}
