import { Address, Hex } from "viem"
import { EstimateOpInput, EstimatedGas, ExecuteOpInput, ScheduleOpInput, UserOperationGasPrice } from "./types"
import { API_URL } from "../common/constants"
import { ExecutionReceipt } from "../common/types"
import { Operation, OperationStatus } from "../data"
import { sendDeleteRequest, sendGetRequest, sendPostRequest } from "../utils/ApiUtils"

export async function createOp(op: Operation, apiKey: string): Promise<Hex> {
    return (await sendPostRequest(API_URL, "operation", { ...op }, apiKey)).opId
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
        : `operation/wallet/${walletAddr}/chain/${chainId}`
    return (await sendGetRequest(API_URL, endpoint)).operations
}

export async function getOps(opIds: Hex[], chainId: string, apiKey: string): Promise<Operation[]> {
    return (await sendPostRequest(API_URL, "operation/get-operations", { opIds, chainId }, apiKey)).operations
}

export async function deleteOp(opId: Hex, chainId: string, apiKey: string): Promise<void> {
    await sendDeleteRequest(API_URL, `operation/${opId}/chain/${chainId}`, apiKey)
}

export async function signOp(
    opId: Hex,
    chainId: string,
    signature: Hex,
    signedBy: Address,
    apiKey: string,
    threshold?: number
): Promise<void> {
    await sendPostRequest(API_URL, "operation/sign", { opId, chainId, signature, signedBy, threshold }, apiKey)
}

export async function executeOp(executeOpInput: ExecuteOpInput, apiKey: string): Promise<ExecutionReceipt> {
    return await sendPostRequest(API_URL, "operation/execute", executeOpInput, apiKey)
}

export async function estimateOp(estimateOpInput: EstimateOpInput, apiKey: string): Promise<EstimatedGas> {
    return await sendPostRequest(API_URL, "operation/estimate", estimateOpInput, apiKey)
}

export async function scheduleOp(scheduleOpInput: ScheduleOpInput, apiKey: string): Promise<void> {
    await sendPostRequest(API_URL, "operation/schedule", scheduleOpInput, apiKey)
}

export const getFullReceipt = async (opId: Hex, chainId: string, userOpHash: string, apiKey: string): Promise<ExecutionReceipt> => {
    const retries = 20
    let result: any
    for (let i = 0; i < retries; i++) {
        try {
            result = await sendGetRequest(API_URL, `operation/${opId}/chain/${chainId}/receipt?userOpHash=${userOpHash}`, apiKey)
            if (result.status === "included") {
                break
            }
        } catch (e) {
            /* empty */
        }

        await new Promise((resolve) => setTimeout(resolve, 2500))
    }
    if (!result.receipt) {
        result.receipt = {
            txId: "Failed to find.",
            gasUsed: "Failed to find.",
            opFeeUSD: "Failed to find.",
            opFee: "Failed to find."
        }
    }
    return {
        ...result.receipt
    }
}

export const getGasPrice = async (chainId: string): Promise<UserOperationGasPrice> => {
    return await sendGetRequest(API_URL, `operation/chain/${chainId}/gas-price`)
}
