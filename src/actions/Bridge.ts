import { Address } from "viem"
import { BridgeParams, SocketSort } from "./types"
import {
    getSocketBridgeAllowance,
    getSocketBridgeApproveTransaction,
    getSocketBridgeQuote,
    getSocketBridgeTransaction
} from "../apis/BridgeApis"
import { APPROVE_AND_EXEC_CONTRACT_INTERFACE, TransactionParams } from "../common"
import { GlobalEnvOption } from "../config"
import { Chain, Token } from "../data"
import { ErrorCode, InvalidParameterError } from "../errors"

export const bridgeTransactionParams = async (
    params: BridgeParams,
    walletAddress: Address,
    txOptions: GlobalEnvOption
): Promise<TransactionParams> => {
    const { recipient, fromToken, toToken, sort } = params
    const fromChain = await Chain.getChain({ chainIdentifier: params.fromChain }, txOptions.apiKey)
    const fromTokenObj = new Token(fromToken, fromChain, walletAddress, txOptions.apiKey)

    const toChain = await Chain.getChain({ chainIdentifier: params.toChain }, txOptions.apiKey)
    const toTokenObj = new Token(toToken, toChain, walletAddress, txOptions.apiKey)

    const amount = await fromTokenObj.getDecimalAmount(params.amount)
    if (!recipient) {
        throw new InvalidParameterError(
            ErrorCode.InvalidParameter,
            "Recipient Parameter was undefined",
            { params },
            "Please provide a recipient",
            "https://docs.fun.xyz"
        )
    }
    const fromChainId = fromChain.getChainId()
    const approveAndExecAddress = fromChain.getAddress("approveAndExecAddress")
    const route = await getSocketBridgeQuote(
        recipient,
        walletAddress,
        fromChainId,
        await toChain.getChainId(),
        await fromTokenObj.getAddress(),
        await toTokenObj.getAddress(),
        amount,
        sort ?? SocketSort.output,
        txOptions.apiKey
    )
    const socketTx = await getSocketBridgeTransaction(route, txOptions.apiKey)
    if (socketTx.result.approvalData !== null) {
        const { allowanceTarget, minimumApprovalAmount } = socketTx.result.approvalData
        const allowanceStatusCheck = await getSocketBridgeAllowance(
            fromChainId,
            walletAddress,
            allowanceTarget,
            await fromTokenObj.getAddress(),
            txOptions.apiKey
        )
        const allowanceValue = allowanceStatusCheck.result.value
        if (minimumApprovalAmount > allowanceValue) {
            const approveTxData = await getSocketBridgeApproveTransaction(
                fromChainId,
                walletAddress,
                allowanceTarget,
                await fromTokenObj.getAddress(),
                amount,
                txOptions.apiKey
            )
            const approveData = approveTxData.result.data
            return APPROVE_AND_EXEC_CONTRACT_INTERFACE.encodeTransactionParams(approveAndExecAddress, "approveAndExecute", [
                socketTx.result.txTarget,
                socketTx.result.value,
                socketTx.result.txData,
                await fromTokenObj.getAddress(),
                approveData
            ])
        }
    }
    return { to: socketTx.result.txTarget, value: socketTx.result.value, data: socketTx.result.txData }
}
