import { Hex, getAddress, pad } from "viem"
import { AddOwnerParams, RemoveOwnerParams, RuleStruct, SessionKeyParams } from "./types"
import { SessionKeyAuth } from "../auth"
import { AuthInput } from "../auth/types"
import { RBAC_CONTRACT_INTERFACE, TransactionParams } from "../common"
import { EnvOption } from "../config"
import { Chain } from "../data"
import { Token } from "../data/Token"
import { ErrorCode, InvalidParameterError } from "../errors"
import { MerkleTree } from "../utils/MerkleUtils"
import { getSigHash } from "../utils/ViemUtils"

export const createFeeRecipientAndTokenMerkleTree = async (params: SessionKeyParams): Promise<MerkleTree> => {
    const recipients = (params.feeRecipientWhitelist ?? []).map((recipient) => getAddress(recipient))

    // TODO: Temporary fallback, remove after refactoring -- Panda
    const options = (globalThis as any).globalEnvOption
    const chain = await Chain.getChain({ chainIdentifier: options.chain })

    const tokens = await Promise.all((params.feeTokenWhitelist ?? []).map((token) => Token.getAddress(token, chain)))
    const feeRecipientAndTokenMerkleTree = new MerkleTree([...recipients, ...tokens])
    return feeRecipientAndTokenMerkleTree
}

export const createTargetSelectorMerkleTree = (params: SessionKeyParams): MerkleTree => {
    const selectors: Hex[] = []
    params.actionWhitelist.forEach((actionWhitelistItem) => {
        selectors.push(...actionWhitelistItem.functionWhitelist.map((functionName) => getSigHash(actionWhitelistItem.abi, functionName)))
    })
    const targets = params.targetWhitelist.map((target) => getAddress(target))
    const targetSelectorMerkleTree = new MerkleTree([...targets, ...selectors])
    return targetSelectorMerkleTree
}

export const createSessionKeyTransactionParams = async (
    params: SessionKeyParams,
    txOptions: EnvOption = (globalThis as any).globalEnvOption
): Promise<TransactionParams> => {
    if (params.targetWhitelist.length === 0) {
        throw new InvalidParameterError(
            ErrorCode.MissingParameter,
            "targetWhitelist is required",
            { params },
            "Provide targetWhitelist when creating a session key.",
            "https://docs.fun.xyz"
        )
    }
    if (params.userId === undefined) {
        throw new InvalidParameterError(
            ErrorCode.MissingParameter,
            "userId is required",
            { params },
            "Provide userId when creating a session key.",
            "https://docs.fun.xyz"
        )
    }
    let { actionValueLimit, feeValueLimit } = params
    actionValueLimit ??= 0n
    feeValueLimit ??= 0n
    const targetSelectorMerkleTree = createTargetSelectorMerkleTree(params)
    const feeRecipientTokenMerkleTree = await createFeeRecipientAndTokenMerkleTree(params)
    const ruleStruct: RuleStruct = {
        deadline: convertTimestampToBigInt(params.deadline),
        targetSelectorMerkleRootHash: targetSelectorMerkleTree.getRootHash(),
        feeRecipientTokenMerkleRootHash: feeRecipientTokenMerkleTree.getRootHash(),
        actionValueLimit,
        feeValueLimit
    }
    const roleId = params.roleId
    const ruleId = params.ruleId
    const userId = params.userId

    const setRuleCallData = RBAC_CONTRACT_INTERFACE.encodeData("setRule", [ruleId, ruleStruct])
    const connectRuleAndRoleCallData = RBAC_CONTRACT_INTERFACE.encodeData("addRuleToRole", [roleId, ruleId])
    const connectUserToRoleCallData = RBAC_CONTRACT_INTERFACE.encodeData("addUserToRole", [roleId, userId])
    const chain = await Chain.getChain({ chainIdentifier: txOptions.chain })
    const rbacAddress = await chain.getAddress("rbacAddress")
    return RBAC_CONTRACT_INTERFACE.encodeTransactionParams(rbacAddress, "multiCall", [
        [setRuleCallData, connectRuleAndRoleCallData, connectUserToRoleCallData]
    ])
}

export const createSessionUser = async (auth: AuthInput, params: SessionKeyParams): Promise<SessionKeyAuth> => {
    const targetSelectorMerkleTree = createTargetSelectorMerkleTree(params)
    const feeRecipientAndTokenMerkleTree = await createFeeRecipientAndTokenMerkleTree(params)
    return new SessionKeyAuth(auth, params.ruleId, params.roleId, targetSelectorMerkleTree, feeRecipientAndTokenMerkleTree)
}

export const addOwnerTxParams = async (
    params: AddOwnerParams,
    txOptions: EnvOption = (globalThis as any).globalEnvOption
): Promise<TransactionParams> => {
    const chain = await Chain.getChain({ chainIdentifier: txOptions.chain })
    const rbacAddress = await chain.getAddress("rbacAddress")
    return RBAC_CONTRACT_INTERFACE.encodeTransactionParams(rbacAddress, "addOwner", [pad(params.ownerId, { size: 32 })])
}

export const removeOwnerTxParams = async (
    params: RemoveOwnerParams,
    txOptions: EnvOption = (globalThis as any).globalEnvOption
): Promise<TransactionParams> => {
    const chain = await Chain.getChain({ chainIdentifier: txOptions.chain })
    const rbacAddress = await chain.getAddress("rbacAddress")
    return RBAC_CONTRACT_INTERFACE.encodeTransactionParams(rbacAddress, "removeOwner", [pad(params.ownerId, { size: 32 })])
}

const convertTimestampToBigInt = (timestamp: number): bigint => {
    if (Math.abs(Date.now() - timestamp) < Math.abs(Date.now() - timestamp * 1000)) {
        // timestamp is in mills
        return BigInt(Math.floor(timestamp)) / 1000n
    } else {
        // timestamp is seconds
        return BigInt(Math.floor(timestamp))
    }
}
