import fetch from "node-fetch"
import { Address } from "viem"
import { BridgeParams } from "./types"
import { APPROVE_AND_EXEC_CONTRACT_INTERFACE, TransactionParams } from "../common"
import { ErrorCode, InvalidParameterError, ResourceNotFoundError } from "../errors"
const SOCKET_API_KEY = "04dd4572-e22b-4bd6-beb9-feb73d31d009" // SOCKET PUBLIC API KEY - can swap for our key in prod
const SOCKET_BASE_API_URL = "https://api.socket.tech/v2/"

export const bridgeTransactionParams = async (params: BridgeParams, walletAddress: Address): Promise<TransactionParams> => {
    const { recipient, fromChain, toChain, fromToken, toToken, amount, sort } = params
    if (!recipient) {
        throw new InvalidParameterError(
            ErrorCode.InvalidParameter,
            "Recipient Parameter was undefined",
            "wallet.bridge",
            { params },
            "Please provide a recipient",
            "https://docs.fun.xyz"
        )
    }
    const approveAndExecAddress = await params.fromChain.getAddress("approveAndExecAddress")
    const route = await getRoute(recipient, await fromChain.getChainId(), await toChain.getChainId(), fromToken, toToken, amount, sort)
    const socketTx = await buildTx(route)
    const { allowanceTarget, minimumApprovalAmount } = socketTx.result.approvalData
    if (socketTx.result.approvalData !== null) {
        const allowanceStatusCheck = await checkAllowance(await fromChain.getChainId(), walletAddress, allowanceTarget, fromToken)
        const allowanceValue = allowanceStatusCheck.result.value
        if (minimumApprovalAmount > allowanceValue) {
            const approveTxData = await buildApproveTx(await fromChain.getChainId(), walletAddress, allowanceTarget, fromToken, amount)
            const approveData = approveTxData.result.data
            return APPROVE_AND_EXEC_CONTRACT_INTERFACE.encodeTransactionParams(approveAndExecAddress, "approveAndExecute", [
                socketTx.result.txTarget,
                socketTx.result.value,
                socketTx.result.txData,
                fromToken,
                approveData
            ])
        }
    }
    return { to: socketTx.result.txTarget, value: socketTx.result.value, data: socketTx.result.txData }
}

async function getRoute(
    walletAddress: string,
    fromChain: string,
    toChain: string,
    fromToken: string,
    toToken: string,
    amount: number,
    sort?: string
): Promise<JSON> {
    const SOCKET_API_ENDPOINT =
        `quote?fromChainId=${fromChain}&fromTokenAddress=${fromToken}&toChainId=${toChain}` +
        `& toTokenAddress=${toToken}&fromAmount=${amount}&userAddress=${walletAddress}&` +
        `uniqueRoutesPerBridge=${true}&sort=${sort ?? "output"}&singleTxOnly=${true}`
    const response = await fetch(SOCKET_BASE_API_URL + SOCKET_API_ENDPOINT, {
        method: "GET",
        headers: {
            "API-KEY": SOCKET_API_KEY,
            Accept: "application/json",
            "Content-Type": "application/json"
        }
    })
    const quote = await response.json()
    if (!quote.success || quote.result.routes.length === 0) {
        throw new ResourceNotFoundError(
            ErrorCode.BridgeRouteNotFound,
            "Unable to find a route for these assets between these chains",
            "wallet.bridge.getQuote",
            { walletAddress, fromChain, toChain, fromToken, toToken, amount, sort },
            "Try another route with a different asset pair",
            "https://docs.fun.xyz"
        )
    }
    const route = quote.result.routes[0]
    return route
}

async function buildTx(route: any): Promise<any> {
    const API_ENDPOINT = "build-tx"
    const response = await fetch(SOCKET_BASE_API_URL + API_ENDPOINT, {
        method: "POST",
        headers: {
            "API-KEY": SOCKET_API_KEY,
            Accept: "application/json",
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ route: route })
    })
    const socketTx = await response.json()
    return socketTx
}

async function checkAllowance(chainId: string, sender: Address, allowanceTarget: string, token: string): Promise<any> {
    const API_ENDPOINT = `approval/check-allowance?chainID=${chainId}&owner=${sender}& allowanceTarget=${allowanceTarget}&tokenAddress=${token}`
    const response = await fetch(SOCKET_BASE_API_URL + API_ENDPOINT, {
        method: "GET",
        headers: {
            "API-KEY": SOCKET_API_KEY,
            Accept: "application/json",
            "Content-Type": "application/json"
        }
    })
    const json = await response.json()
    return json
}

async function buildApproveTx(chainId: string, sender: Address, allowanceTarget: string, token: string, amount: number): Promise<any> {
    const API_ENDPOINT = `build-tx?chainID=${chainId}&owner=${sender}&allowanceTarget=${allowanceTarget}&tokenAddress=${token}&amount=${amount}`
    const response = await fetch(SOCKET_BASE_API_URL + API_ENDPOINT, {
        method: "GET",
        headers: {
            "API-KEY": SOCKET_API_KEY,
            Accept: "application/json",
            "Content-Type": "application/json"
        }
    })
    const json = await response.json()
    if (!json.result) {
        throw new ResourceNotFoundError(
            ErrorCode.BridgeApproveTxDataNotFound,
            "Unable to build the approve transaction data",
            "wallet.bridge.buildApproveTx",
            { chainId, sender, allowanceTarget, token, amount },
            "Make sure the token and allowance are valid values",
            "https://docs.fun.xyz"
        )
    }
    return json
}
