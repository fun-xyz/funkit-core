import { FeeAmount } from "@uniswap/v3-sdk"
import { encodeAbiParameters } from "viem"
import { LimitOrderParam } from "./types"
import {
    APPROVE_AND_EXEC_CONTRACT_INTERFACE,
    ERC20_CONTRACT_INTERFACE,
    TransactionParams,
    UNISWAP_V3_LIMIT_ORDER_CONTRACT_INTERFACE
} from "../common"
import { Chain, Token } from "../data"

const fees = {
    lowest: FeeAmount.LOWEST,
    low: FeeAmount.LOW,
    medium: FeeAmount.MEDIUM,
    high: FeeAmount.HIGH
}

export const limitSwapOrderTransactionParams = async (
    params: LimitOrderParam,
    chain: Chain,
    apiKey: string
): Promise<TransactionParams> => {
    const { tokenIn, tokenOut, tokenInAmount, tokenOutAmount, poolFee } = params
    const tokenInObj = new Token(tokenIn, chain, "0x", apiKey)
    const tokenOutObj = new Token(tokenOut, chain, "0x", apiKey)
    const tokenInAddress = await tokenInObj.getAddress()
    const tokenOutAddress = await tokenOutObj.getAddress()
    const amountIn = await tokenInObj.getDecimalAmount(tokenInAmount)
    const amountOut = await tokenOutObj.getDecimalAmount(tokenOutAmount)
    const uniswapv3LimitOrderAddress = chain.getAddress("uniswapv3LimitOrder")
    const approveAndExecAddress = chain.getAddress("approveAndExecAddress")
    const _poolFee = poolFee ? fees[poolFee] : FeeAmount.MEDIUM
    const data = encodeAbiParameters(
        [
            {
                type: "tuple",
                components: [{ type: "uint24" }, { type: "address" }, { type: "address" }, { type: "uint256" }, { type: "uint256" }]
            }
        ],
        [[_poolFee, tokenInAddress, tokenOutAddress, amountIn, amountOut]]
    )

    const UniswapV3LimitOrderExecuteData = UNISWAP_V3_LIMIT_ORDER_CONTRACT_INTERFACE.encodeTransactionParams(
        uniswapv3LimitOrderAddress,
        "execute",
        [data]
    ).data
    const approveData = ERC20_CONTRACT_INTERFACE.encodeTransactionParams(tokenInAddress, "approve", [
        uniswapv3LimitOrderAddress,
        amountIn
    ]).data
    const approveAndExecData = APPROVE_AND_EXEC_CONTRACT_INTERFACE.encodeTransactionParams(approveAndExecAddress, "approveAndExecute", [
        uniswapv3LimitOrderAddress,
        0,
        UniswapV3LimitOrderExecuteData,
        tokenInAddress,
        approveData
    ])
    return approveAndExecData
}
