import { Address } from "viem"
import { BridgeParams } from "./types"
import {
    getSocketBridgeAllowance,
    getSocketBridgeApproveTransaction,
    getSocketBridgeQuote,
    getSocketBridgeTransaction
} from "../apis/BridgeApis"
import { APPROVE_AND_EXEC_CONTRACT_INTERFACE, TransactionParams } from "../common"
import { Chain, Token } from "../data"
import { ErrorCode, InvalidParameterError } from "../errors"

export const bridgeTransactionParams = async (params: BridgeParams, walletAddress: Address): Promise<TransactionParams> => {
    const { recipient, fromToken, toToken, sort } = params
    const tokenObj = new Token(fromToken)
    const amount = await tokenObj.getDecimalAmount(params.amount)
    if (!recipient) {
        throw new InvalidParameterError(
            ErrorCode.InvalidParameter,
            "Recipient Parameter was undefined",
            { params },
            "Please provide a recipient",
            "https://docs.fun.xyz"
        )
    }
    const fromChain = await Chain.getChain({ chainIdentifier: params.fromChain })
    const toChain = await Chain.getChain({ chainIdentifier: params.toChain })
    const fromChainId = await fromChain.getChainId()
    const approveAndExecAddress = await fromChain.getAddress("approveAndExecAddress")
    const route = await getSocketBridgeQuote(
        recipient,
        walletAddress,
        fromChainId,
        await toChain.getChainId(),
        fromToken,
        toToken,
        amount,
        sort
    )
    const socketTx = await getSocketBridgeTransaction(route)
    const { allowanceTarget, minimumApprovalAmount } = socketTx.result.approvalData
    if (socketTx.result.approvalData !== null) {
        const allowanceStatusCheck = await getSocketBridgeAllowance(fromChainId, walletAddress, allowanceTarget, fromToken)
        const allowanceValue = allowanceStatusCheck.result.value
        if (minimumApprovalAmount > allowanceValue) {
            const approveTxData = await getSocketBridgeApproveTransaction(fromChainId, walletAddress, allowanceTarget, fromToken, amount)
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
