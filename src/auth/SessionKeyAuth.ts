import { Hex, decodeAbiParameters, pad, toBytes } from "viem"
import { Auth } from "./Auth"
import { AuthInput, WalletCallData } from "./types"
import { ETH_TRANSFER_SELECTOR, WALLET_ABI } from "../common"
import { Chain, Operation, WalletSignature, encodeWalletSignature } from "../data"
import { randomBytes } from "../utils"
import { MerkleTree } from "../utils/MerkleUtils"
import { getSigHash } from "../utils/ViemUtils"

const SELECTOR_LENGTH = 10
const execFromEntryPointSelector = getSigHash(WALLET_ABI, "execFromEntryPoint")
const execFromEntryPointFeeSelector = getSigHash(WALLET_ABI, "execFromEntryPointWithFee")

export class SessionKeyAuth extends Auth {
    ruleId: Hex
    roleId: Hex

    targetSelectorMerkleTree?: MerkleTree
    feeRecipientMerkleTree?: MerkleTree

    constructor(authInput: AuthInput, ruleId: Hex = randomBytes(32), roleId: Hex = randomBytes(32)) {
        super(authInput)
        this.ruleId = ruleId
        this.roleId = roleId
    }

    async getRuleId(): Promise<Hex> {
        return this.ruleId
    }

    async getRoleId(): Promise<Hex> {
        return this.roleId
    }

    override async signOp(operation: Operation, chain: Chain): Promise<Hex> {
        if (!this.targetSelectorMerkleTree) {
            throw new Error("SessionKeyAuth not connected to wallet")
        }
        await this.init()
        const opHash = await operation.getOpHash(chain)

        let signature
        if (this.signer?.type === "local") {
            signature = await this.signer.signMessage({ message: { raw: toBytes(opHash) } })
        } else if (this.client && this.account) {
            signature = await this.client.signMessage({ account: this.account, message: { raw: toBytes(opHash) } })
        } else {
            throw new Error("No signer or client")
        }
        const target = getTargetFromCall(operation.userOp.callData as Hex)
        const selector = getSelectorFromCall(operation.userOp.callData as Hex)
        const walletSignature: WalletSignature = {
            userId: await this.getUserId(),
            signature: signature,
            roleId: this.roleId,
            ruleId: this.ruleId,
            extraData: {
                targetPath: this.targetSelectorMerkleTree.getPathForItem(target),
                selectorPath: this.targetSelectorMerkleTree.getPathForItem(selector)
            }
        }
        return encodeWalletSignature(walletSignature)
    }

    override async getEstimateGasSignature(userId: string, operation: Operation): Promise<Hex> {
        if (!this.targetSelectorMerkleTree) {
            throw new Error("SessionKeyAuth not connected to wallet")
        }
        await this.init()
        const target = getTargetFromCall(operation.userOp.callData as Hex)
        const selector = getSelectorFromCall(operation.userOp.callData as Hex)
        try {
            const walletSignature: WalletSignature = {
                userId: pad(userId as Hex, { size: 32 }),
                signature: pad("0x", { size: 65 }),
                roleId: this.roleId,
                ruleId: this.ruleId,
                extraData: {
                    targetPath: this.targetSelectorMerkleTree.getPathForItem(target),
                    selectorPath: this.targetSelectorMerkleTree.getPathForItem(selector)
                }
            }
            return encodeWalletSignature(walletSignature)
        } catch {
            throw new Error("Function or target is not allowed in session key")
        }
    }

    setTargetSelectorMerkleTree(targetSelectorMerkleTree: MerkleTree) {
        this.targetSelectorMerkleTree = targetSelectorMerkleTree
    }

    setFeeRecipientMerkleTree(feeRecipientMerkleTree: MerkleTree) {
        this.feeRecipientMerkleTree = feeRecipientMerkleTree
    }
}

export const getTargetFromCall = (callData: Hex): Hex => {
    return decodeCalldata(callData).target
}
export const getSelectorFromCall = (callData: Hex): Hex => {
    const out = decodeCalldata(callData).calldata.slice(0, SELECTOR_LENGTH) as Hex
    return out === "0x" ? ETH_TRANSFER_SELECTOR : out
}

export const decodeCalldata = (callData: Hex): WalletCallData => {
    if (callData.includes(execFromEntryPointFeeSelector)) {
        return _decodeExecWithFee(callData)
    } else if (callData.includes(execFromEntryPointSelector)) {
        return _decodeExec(callData)
    }
    throw new Error("invalid call data. must be execFromEntryPoint or execFromEntryPointWithFee")
}

const _decodeExecWithFee = (callData: Hex): WalletCallData => {
    const walletcalldata = ("0x" + callData.slice(SELECTOR_LENGTH)) as Hex
    const [target, value, calldata] = decodeAbiParameters([{ type: "address" }, { type: "uint256" }, { type: "bytes" }], walletcalldata)
    return {
        target: target as Hex,
        value: value as bigint,
        calldata: calldata as Hex
    }
}
const _decodeExec = (callData: Hex): WalletCallData => {
    const walletcalldata = ("0x" + callData.slice(SELECTOR_LENGTH)) as Hex
    const [target, value, calldata] = decodeAbiParameters([{ type: "address" }, { type: "uint256" }, { type: "bytes" }], walletcalldata)
    return {
        target: target as Hex,
        value: value as bigint,
        calldata: calldata as Hex
    }
}
