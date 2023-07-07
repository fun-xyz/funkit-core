import { API_URL } from "../common/constants"
import { UserOperation } from "../data"
import { objectify } from "../utils"
import { sendGetRequest, sendPostRequest } from "../utils/ApiUtils"

export async function sendUserOpToBundler(userOp: any, entryPointAddress: string, chainId: string): Promise<any> {
    return await sendPostRequest(API_URL, "user-op/send", { userOp: objectify(userOp), entryPointAddress, chainId })
}

export async function estimateUserOpGas(userOp: UserOperation, entryPointAddress: string, chainId: string): Promise<any> {
    return await sendPostRequest(API_URL, "user-op/estimate-gas", { userOp: objectify(userOp), entryPointAddress, chainId })
    // return await sendPostRequest("https://api.fun.xyz", "bundler/estimate-user-op-gas", {
    //     userOp: objectify(userOp),
    //     entryPointAddress,
    //     chainId
    // })
}

export async function validateChainId(chainId: string): Promise<any> {
    return await sendGetRequest(API_URL, `chain-info/${chainId}`)
}

// Deprecated
export async function getChainId(bundlerUrl: string): Promise<any> {
    const response = await sendGetRequest(API_URL, `bundler/get-chain-id?bundlerUrl=${bundlerUrl}`)
    return response.chainId
}
