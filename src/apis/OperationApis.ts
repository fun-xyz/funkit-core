import { Address, Hex } from "viem"
import { API_URL } from "../common/constants"
import { Operation, OperationStatus } from "../data"
import { sendDeleteRequest, sendGetRequest, sendPostRequest } from "../utils/ApiUtils"

export async function createOp(op: Operation): Promise<string> {
    return (await sendPostRequest(API_URL, "operation", { ...op })).opId
}

export async function getOpsOfGroup(groupId: Hex, chainId: string, status: OperationStatus): Promise<Operation[]> {
    const endpoint =
        status === OperationStatus.ALL
            ? `operation/group/${groupId}/${chainId}`
            : `operation/group/${groupId}/chain/${chainId}?status=${status}`
    return (await sendGetRequest(API_URL, endpoint)).operations
}

export async function getOpsOfWallet(walletAddr: Address, chainId: string, status?: OperationStatus): Promise<Operation[]> {
    const endpoint = status
        ? `operation/wallet/${walletAddr}/chain/${chainId}?status=${status}`
        : `operation/wallet/${walletAddr}/${chainId}`
    return (await sendGetRequest(API_URL, endpoint)).operations
}

export async function getOps(opIds: Hex[], chainId: string): Promise<Operation[]> {
    return (await sendPostRequest(API_URL, "operation/get-operations", { opIds, chainId })).operations
}

export async function deleteOp(opId: Hex, chainId: string): Promise<void> {
    await sendDeleteRequest(API_URL, `operation/${opId}/chain/${chainId}`)
}

export async function signOp(opId: Hex, chainId: string, signature: Hex, signedBy: Address): Promise<void> {
    await sendPostRequest(API_URL, "operation/sign", { opId, chainId, signature, signedBy })
}

export async function executeOp(
    opId: Hex,
    chainId: string,
    executedBy: string,
    entryPointAddress: Address,
    signature?: string
): Promise<void> {
    await sendPostRequest(API_URL, "operation/execute", { opId, chainId, executedBy, entryPointAddress, signature })
}
