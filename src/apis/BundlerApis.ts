import { API_URL, LOCAL_FORK_CHAIN_ID } from "../common/constants"
import { sendPostRequest, sendGetRequest } from "../utils/Api"
import { JsonRpcProvider } from "@ethersproject/providers"

export async function sendUserOpToBundler(
    userOp: any,
    entryPointAddress: string,
    chainId: string,
    provider?: JsonRpcProvider
): Promise<any> {
    if (Number(chainId) == LOCAL_FORK_CHAIN_ID) {
        return await provider!.send("eth_sendUserOperation", [userOp, entryPointAddress])
    } else {
        return await sendPostRequest(API_URL, "bundler/send-user-op", { userOp, entryPointAddress, chainId })
    }
}

export async function estimateUserOpGas(userOp: any, entryPointAddress: string, chainId: string, provider?: JsonRpcProvider): Promise<any> {
    if (Number(chainId) == LOCAL_FORK_CHAIN_ID) {
        return await provider!.send("eth_estimateUserOperationGas", [userOp, entryPointAddress])
    } else {
        return await sendPostRequest(API_URL, "bundler/estimate-user-op-gas", { userOp, entryPointAddress, chainId })
    }
}

export async function validateChainId(chainId: string, provider?: JsonRpcProvider): Promise<any> {
    if (Number(chainId) == LOCAL_FORK_CHAIN_ID) {
        const chain = await provider!.send("eth_chainId", [])
        return chain
    } else {
        return await sendPostRequest(API_URL, "bundler/validate-chain-id", { chainId })
    }
}

export async function getChainId(bundlerUrl: string): Promise<any> {
    const response = await sendGetRequest(API_URL, `bundler/get-chain-id?bundlerUrl=${encodeURIComponent(bundlerUrl)}`)
    return response.chainId
}
