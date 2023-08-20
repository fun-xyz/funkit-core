import { FeeAmount } from "@uniswap/v3-sdk"
import { encodeAbiParameters } from "viem"
import { LimitOrderParam } from "./types"
import {
    APPROVE_AND_EXEC_CONTRACT_INTERFACE,
    ERC20_CONTRACT_INTERFACE,
    TransactionParams,
    UNISWAP_V3_LIMIT_ORDER_CONTRACT_INTERFACE
} from "../common"
import { EnvOption } from "../config"
import { Chain, Token } from "../data"

const fees = {
    lowest: FeeAmount.LOWEST,
    low: FeeAmount.LOW,
    medium: FeeAmount.MEDIUM,
    high: FeeAmount.HIGH
}

export const limitSwapOrderTransactionParams = async (
    params: LimitOrderParam,
    txOptions: EnvOption = (globalThis as any).globalEnvOption
): Promise<TransactionParams> => {
    const { tokenIn, tokenOut, tokenInAmount, tokenOutAmount, poolFee } = params
    const tokenInAddress = await new Token(tokenIn).getAddress()
    const tokenOutAddress = await new Token(tokenOut).getAddress()
    const amountIn = await new Token(tokenIn).getDecimalAmount(tokenInAmount)
    const amountOut = await new Token(tokenOut).getDecimalAmount(tokenOutAmount)
    const chain = await Chain.getChain({ chainIdentifier: txOptions.chain })
    const uniswapv3LimitOrderAddress = await chain.getAddress("uniswapv3LimitOrder")
    const approveAndExecAddress = await chain.getAddress("approveAndExecAddress")
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
        tokenInAmount
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
