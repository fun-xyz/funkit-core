import { Address } from "viem"
import { BridgeParams, SocketSort } from "./types"
import {
    getSocketBridgeAllowance,
    getSocketBridgeApproveTransaction,
    getSocketBridgeQuote,
    getSocketBridgeTransaction
} from "../apis/BridgeApis"
import { APPROVE_AND_EXEC_CONTRACT_INTERFACE, TransactionParams } from "../common"
import { Chain, Token } from "../data"
import { ErrorCode, InvalidParameterError } from "../errors"

export const bridgeTransactionParams = async (params: BridgeParams, walletAddress: Address, chain: Chain): Promise<TransactionParams> => {
    const { recipient, fromToken, toToken, sort } = params
    const fromTokenObj = new Token(fromToken, chain)
    const toTokenObj = new Token(toToken, chain)
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
    const fromChain = await Chain.getChain({ chainIdentifier: params.fromChain })
    const toChain = await Chain.getChain({ chainIdentifier: params.toChain })
    const fromChainId = await fromChain.getChainId()
    const approveAndExecAddress = await fromChain.getAddress("approveAndExecAddress")
    const route = await getSocketBridgeQuote(
        recipient,
        walletAddress,
        fromChainId,
        await toChain.getChainId(),
        await fromTokenObj.getAddress(),
        await toTokenObj.getAddress(),
        amount,
        sort ?? SocketSort.output
    )
    const socketTx = await getSocketBridgeTransaction(route)
    if (socketTx.result.approvalData !== null) {
        const { allowanceTarget, minimumApprovalAmount } = socketTx.result.approvalData
        const allowanceStatusCheck = await getSocketBridgeAllowance(
            fromChainId,
            walletAddress,
            allowanceTarget,
            await fromTokenObj.getAddress()
        )
        const allowanceValue = allowanceStatusCheck.result.value
        if (minimumApprovalAmount > allowanceValue) {
            const approveTxData = await getSocketBridgeApproveTransaction(
                fromChainId,
                walletAddress,
                allowanceTarget,
                await fromTokenObj.getAddress(),
                amount
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
