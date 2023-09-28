import { Hex, decodeAbiParameters, pad, toBytes } from "viem"
import { Auth } from "./Auth"
import { AuthInput, WalletCallData } from "./types"
import { ETH_TRANSFER_SELECTOR, USER_AUTHENTICATION_CONTRACT_INTERFACE, WALLET_ABI } from "../common"
import { Chain, Operation, WalletSignature, encodeWalletSignature } from "../data"
import { MerkleTree } from "../utils/MerkleUtils"
import { getSigHash } from "../utils/ViemUtils"
import { ethers } from "ethers"

const SELECTOR_LENGTH = 10
const execFromEntryPointSelector = getSigHash(WALLET_ABI, "execFromEntryPoint")
const execFromEntryPointFeeSelector = getSigHash(WALLET_ABI, "execFromEntryPointWithFee")

export class SessionKeyAuth extends Auth {
    ruleId: Hex
    roleId: Hex

    targetSelectorMerkleTree: MerkleTree
    feeRecipientMerkleTree: MerkleTree

    constructor(authInput: AuthInput, ruleId: Hex, roleId: Hex, targetSelectorMerkleTree: MerkleTree, feeRecipientMerkleTree: MerkleTree) {
        super(authInput)
        this.ruleId = ruleId
        this.roleId = roleId
        this.targetSelectorMerkleTree = targetSelectorMerkleTree
        this.feeRecipientMerkleTree = feeRecipientMerkleTree
    }

    override async signOp(operation: Operation, chain: Chain): Promise<Hex> {
        if (!this.targetSelectorMerkleTree) {
            throw new Error("SessionKeyAuth not connected to wallet")
        }
        await this.init()
        if ((await chain.getChainId()) !== "5") {
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
        } else {
            const userAuthAddress = await chain.getAddress("userAuthAddress")
            const domain = {
                name: await USER_AUTHENTICATION_CONTRACT_INTERFACE.readFromChain(userAuthAddress, "EIP712_NAME", [], chain),
                version: await USER_AUTHENTICATION_CONTRACT_INTERFACE.readFromChain(userAuthAddress, "EIP712_VERSION", [], chain),
                chainId: await USER_AUTHENTICATION_CONTRACT_INTERFACE.readFromChain(userAuthAddress, "CHAIN_ID", [], chain),
                verifyingContract: userAuthAddress
            }
            const types = {
                UserOperation: [
                    { name: "sender", type: "address" },
                    { name: "nonce", type: "uint256" },
                    { name: "initCode", type: "bytes" },
                    { name: "callData", type: "bytes" },
                    { name: "callGasLimit", type: "uint256" },
                    { name: "verificationGasLimit", type: "uint256" },
                    { name: "preVerificationGas", type: "uint256" },
                    { name: "maxFeePerGas", type: "uint256" },
                    { name: "maxPriorityFeePerGas", type: "uint256" },
                    { name: "paymasterAndData", type: "bytes" },
                    { name: "entrypoint", type: "address" },
                    { name: "chainid", type: "uint256" }
                ]
            }
            const value = {
                sender: operation.userOp.sender,
                nonce: operation.userOp.nonce,
                initCode: operation.userOp.initCode,
                callData: operation.userOp.callData,
                callGasLimit: operation.userOp.callGasLimit,
                verificationGasLimit: operation.userOp.verificationGasLimit,
                preVerificationGas: operation.userOp.preVerificationGas,
                maxFeePerGas: operation.userOp.maxFeePerGas,
                maxPriorityFeePerGas: operation.userOp.maxPriorityFeePerGas,
                paymasterAndData: operation.userOp.paymasterAndData,
                entrypoint: await chain.getAddress("entryPointAddress"),
                chainid: BigInt(Number(await chain.getChainId()))
            }
            let EIP712signature
            if (this.signer?.type === "local") {
                EIP712signature = await this.signer.signTypedData({
                    domain,
                    types,
                    primaryType: "UserOperation",
                    message: value
                })
            } else if (this.client && this.account) {
                EIP712signature = await this.client.signTypedData({
                    account: await this.client.account!,
                    domain,
                    types,
                    primaryType: "UserOperation",
                    message: value
                })
            } else {
                throw new Error("No signer or client")
            }
            const { v, r, s } = ethers.utils.splitSignature(EIP712signature)
            const signature = ethers.utils.defaultAbiCoder.encode(["uint8", "bytes32", "bytes32"], [v, r, s]) as Hex
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
    }

    override async getEstimateGasSignature(userId: string, operation: Operation): Promise<Hex> {
        if (!this.targetSelectorMerkleTree) {
            throw new Error("SessionKeyAuth not connected to wallet")
        }
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
