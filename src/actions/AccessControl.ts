import { Hex, getAddress, padHex } from "viem"
import { RuleStruct, SessionKeyParams } from "./types"
import { SessionKeyAuth } from "../auth"
import { RBAC_CONTRACT_INTERFACE, WALLET_CONTRACT_INTERFACE } from "../common"
import { getChainFromData } from "../data"
import { Token } from "../data/Token"
import { Helper, MissingParameterError } from "../errors"
import { objectify, randomBytes } from "../utils"
import { MerkleTree } from "../utils/MerkleUtils"
import { getSigHash } from "../utils/ViemUtils"
export const HashOne = padHex("0x1", { size: 32 })

export const createSessionKeyCalldata = async (params: SessionKeyParams) => {
    if (params.targetWhitelist.length === 0) {
        const currentLocation = "createSessionKeyCalldata"
        const helper = new Helper(`${currentLocation} was given these parameters`, objectify(params), "targetWhitelist is empty")
        throw new MissingParameterError(currentLocation, helper)
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
        deadline: params.deadline,
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
    const multicallCallData = RBAC_CONTRACT_INTERFACE.encodeData("multiCall", [
        [setRuleCallData, connectRuleAndRoleCallData, connectUserToRoleCallData]
    ])
    const chain = await getChainFromData(params.chainId)
    const rbacAddress = await chain.getAddress("rbacAddress")
    return WALLET_CONTRACT_INTERFACE.encodeData("execFromEntryPoint", [rbacAddress, 0, multicallCallData])
}

export const createSessionUser = () => {
    return new SessionKeyAuth({ privateKey: randomBytes(32) })
}
