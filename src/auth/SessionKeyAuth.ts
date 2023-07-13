import { Hex, decodeAbiParameters, pad, toBytes } from "viem"
import { Eoa } from "./EoaAuth"
import { EoaAuthInput, WalletCallData } from "./types"
import { Chain, UserOp, WalletSignature, encodeWalletSignature } from "../data"
import { randomBytes } from "../utils"
import { MerkleTree } from "../utils/MerkleUtils"

export class SessionKeyAuth extends Eoa {
    ruleId: Hex
    roleId: Hex

    targetSelectorMerkleTree?: MerkleTree
    feeRecipientMerkleTree?: MerkleTree

    constructor(authInput: EoaAuthInput) {
        super(authInput)
        this.ruleId = randomBytes(32)
        this.roleId = randomBytes(32)
    }

    override async signOp(userOp: UserOp, chain: Chain): Promise<string> {
        if (!this.targetSelectorMerkleTree) {
            throw new Error("SessionKeyAuth not connected to wallet")
        }
        await this.init()
        const opHash = await userOp.getOpHashData(chain)

        let signature
        if (this.signer?.type === "local") {
            signature = await this.signer.signMessage({ message: { raw: toBytes(opHash) } })
        } else if (this.client && this.account) {
            signature = await this.client.signMessage({ account: this.account, message: { raw: toBytes(opHash) } })
        } else {
            throw new Error("No signer or client")
        }
        const target = getTargetFromCall(userOp.op.callData as Hex)
        const selector = getSelectorFromCall(userOp.op.callData as Hex)
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

    override async getEstimateGasSignature(userOp: UserOp): Promise<string> {
        if (!this.targetSelectorMerkleTree) {
            throw new Error("SessionKeyAuth not connected to wallet")
        }
        await this.init()
        const target = getTargetFromCall(userOp.op.callData as Hex)
        const selector = getSelectorFromCall(userOp.op.callData as Hex)

        try {
            const walletSignature: WalletSignature = {
                userId: await this.getUserId(),
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
            throw new Error("Function  or target is not allowed in session key")
        }
    }

    setTargetSelectorMerkleTree(targetSelectorMerkleTree: MerkleTree) {
        this.targetSelectorMerkleTree = targetSelectorMerkleTree
    }

    setFeeRecipientMerkleTree(feeRecipientMerkleTree: MerkleTree) {
        this.feeRecipientMerkleTree = feeRecipientMerkleTree
    }
}

export const getTargetFromCall = (callData: Hex) => {
    return decodeCalldata(callData).target
}
export const getSelectorFromCall = (callData: Hex) => {
    return decodeCalldata(callData).calldata.slice(0, 10) as Hex
}

export const decodeCalldata = (callData: Hex): WalletCallData => {
    const walletcalldata = ("0x" + callData.slice(10)) as Hex
    const [target, value, calldata] = decodeAbiParameters([{ type: "address" }, { type: "uint256" }, { type: "bytes" }], walletcalldata)
    return {
        target: target as Hex,
        value: value as bigint,
        calldata: calldata as Hex
    }
}
