import { Address } from "viem"
import { API_URL } from "../common/constants"
import { ErrorCode, ResourceNotFoundError } from "../errors"
import { sendGetRequest, sendPostRequest } from "../utils/ApiUtils"

export async function getSocketBridgeQuote(
    recipient: string,
    walletAddress: string,
    fromChain: string,
    toChain: string,
    fromToken: string,
    toToken: string,
    amount: bigint,
    sort: string
): Promise<any> {
    const params = new URLSearchParams({
        recipient: recipient,
        fromChainId: fromChain,
        fromTokenAddress: fromToken,
        toChainId: toChain,
        toTokenAddress: toToken,
        fromAmount: amount.toString(),
        userAddress: walletAddress,
        uniqueRoutesPerBridge: "true",
        sort,
        singleTxOnly: "true"
    }).toString()
    const quote = await sendGetRequest(API_URL, `bridge/quote/?${params}`)
    if (!quote.success || quote.result.routes.length === 0) {
        throw new ResourceNotFoundError(
            ErrorCode.BridgeRouteNotFound,
            "Unable to find a route for these assets between these chains",
            { walletAddress, fromChain, toChain, fromToken, toToken, amount, sort },
            "Try another route with a different asset pair",
            "https://docs.fun.xyz"
        )
    }
    const route = quote.result.routes[0]
    return route
}

export async function getSocketBridgeTransaction(route: any): Promise<any> {
    return await sendPostRequest(API_URL, "bridge/build-tx/", { route })
}

export async function getSocketBridgeAllowance(chainId: string, sender: Address, allowanceTarget: string, token: string): Promise<any> {
    const params = new URLSearchParams({
        chainId: chainId,
        owner: sender,
        allowanceTarget: allowanceTarget,
        tokenAddress: token
    }).toString()
    const json = await sendGetRequest(API_URL, `bridge/approval/check-allowance/?${params}`)
    if (!json.result.value) {
        throw new ResourceNotFoundError(
            ErrorCode.BridgeAllowanceDataNotFound,
            "Unable to get allowance data",
            { chainId, sender, allowanceTarget, token },
            "Make sure the chainId, sender, allowanceTarget, and token are correct",
            "https://docs.fun.xyz"
        )
    }
    return json
}

export async function getSocketBridgeApproveTransaction(
    chainId: string,
    sender: Address,
    allowanceTarget: string,
    token: string,
    amount: bigint
): Promise<any> {
    const params = new URLSearchParams({
        chainId: chainId,
        owner: sender,
        allowanceTarget: allowanceTarget,
        tokenAddress: token,
        amount: amount.toString()
    }).toString()
    const json = await sendGetRequest(API_URL, `bridge/approval/build-tx/?${params}`)
    if (!json.result) {
        throw new ResourceNotFoundError(
            ErrorCode.BridgeApproveTxDataNotFound,
            "Unable to build the approve transaction data",
            { chainId, sender, allowanceTarget, token, amount },
            "Make sure the token and allowance are valid values",
            "https://docs.fun.xyz"
        )
    }
    return json
}
