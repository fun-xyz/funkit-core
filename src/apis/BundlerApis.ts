import { API_URL } from "../common/constants"
import { UserOperation } from "../data"
import { objectify } from "../utils"
import { sendGetRequest, sendPostRequest } from "../utils/ApiUtils"

export async function sendUserOpToBundler(userOp: any, entryPointAddress: string, chainId: string): Promise<any> {
    const data = await sendPostRequest(API_URL, "bundler/send-user-op", { userOp: objectify(userOp), entryPointAddress, chainId })
    return data
}

export async function estimateUserOpGas(userOp: UserOperation, entryPointAddress: string, chainId: string): Promise<any> {
    return await sendPostRequest(API_URL, "bundler/estimate-user-op-gas", { userOp: objectify(userOp), entryPointAddress, chainId })
}

export async function validateChainId(chainId: string): Promise<any> {
    return await sendPostRequest(API_URL, "bundler/validate-chain-id", { chainId })
}

export async function getChainId(bundlerUrl: string): Promise<any> {
    const response = await sendGetRequest(API_URL, `bundler/get-chain-id?bundlerUrl=${bundlerUrl}`)
    return response.chainId
}
