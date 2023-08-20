import { Hex, getAddress, pad, padHex } from "viem"
import { AddOwnerParams, RemoveOwnerParams, RuleStruct, SessionKeyParams } from "./types"
import { SessionKeyAuth } from "../auth"
import { RBAC_CONTRACT_INTERFACE, TransactionParams } from "../common"
import { EnvOption } from "../config"
import { Chain } from "../data"
import { Token } from "../data/Token"
import { ErrorCode, InvalidParameterError } from "../errors"
import { randomBytes } from "../utils"
import { MerkleTree } from "../utils/MerkleUtils"
import { getSigHash } from "../utils/ViemUtils"

export const HashOne = padHex("0x1", { size: 32 })

export const createSessionKeyTransactionParams = async (
    params: SessionKeyParams,
    txOptions: EnvOption = (globalThis as any).globalEnvOption
): Promise<TransactionParams> => {
    if (params.targetWhitelist.length === 0) {
        throw new InvalidParameterError(
            ErrorCode.MissingParameter,
            "targetWhitelist is required",
            "createSessionKeyTransactionParams",
            { params },
            "Provide targetWhitelist when creating a session key.",
            "https://docs.fun.xyz"
        )
    }
    let { actionValueLimit, feeValueLimit } = params
    actionValueLimit ??= 0n
    feeValueLimit ??= 0n
    const selectors: Hex[] = []
    params.actionWhitelist.forEach((actionWhitelistItem) => {
        selectors.push(...actionWhitelistItem.functionWhitelist.map((functionName) => getSigHash(actionWhitelistItem.abi, functionName)))
    })
    const targets = params.targetWhitelist.map((target) => getAddress(target))

    let feeRecipientTokenMerkleRootHash = HashOne
    if (params.feeRecipientWhitelist && params.feeTokenWhitelist) {
        const recipients = params.feeRecipientWhitelist.map((recipient) => getAddress(recipient))
        const tokens = await Promise.all(params.feeTokenWhitelist.map((token) => Token.getAddress(token)))
        const feeRecipientAndTokenMerkleTree = new MerkleTree([...recipients, ...tokens])
        feeRecipientTokenMerkleRootHash = feeRecipientAndTokenMerkleTree.getRoot()
        params.user.setFeeRecipientMerkleTree(feeRecipientAndTokenMerkleTree)
    }
    const targetSelectorMerkleTree = new MerkleTree([...targets, ...selectors])
    const targetSelectorMerkleRootHash = targetSelectorMerkleTree.getRoot()
    params.user.setTargetSelectorMerkleTree(targetSelectorMerkleTree)
    const ruleStruct: RuleStruct = {
        deadline: convertTimestampToBigInt(params.deadline),
        targetSelectorMerkleRootHash,
        feeRecipientTokenMerkleRootHash,
        actionValueLimit,
        feeValueLimit
    }
    const roleId = params.user.roleId
    const ruleId = params.user.ruleId
    const userid = await params.user.getUserId()

    const setRuleCallData = RBAC_CONTRACT_INTERFACE.encodeData("setRule", [ruleId, ruleStruct])
    const connectRuleAndRoleCallData = RBAC_CONTRACT_INTERFACE.encodeData("addRuleToRole", [roleId, ruleId])
    const connectUserToRoleCallData = RBAC_CONTRACT_INTERFACE.encodeData("addUserToRole", [roleId, userid])
    const chain = await Chain.getChain({ chainIdentifier: txOptions.chain })
    const rbacAddress = await chain.getAddress("rbacAddress")
    return RBAC_CONTRACT_INTERFACE.encodeTransactionParams(rbacAddress, "multiCall", [
        [setRuleCallData, connectRuleAndRoleCallData, connectUserToRoleCallData]
    ])
}

export const createSessionUser = () => {
    return new SessionKeyAuth({ privateKey: randomBytes(32) })
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
