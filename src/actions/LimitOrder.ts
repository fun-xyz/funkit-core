import { encodeAbiParameters } from "viem"
import { LimitOrderParam } from "./types"
import {
    APPROVE_AND_EXEC_CONTRACT_INTERFACE,
    ERC20_CONTRACT_INTERFACE,
    TransactionParams,
    UNISWAP_V3_LIMIT_ORDER_CONTRACT_INTERFACE
} from "../common"
import { Chain, Token } from "../data"

export const LimitOrderTransactionParams = async (
    params: LimitOrderParam,
    chainId: string | Chain | number
): Promise<TransactionParams> => {
    const { tokenIn, tokenOut, tokenInAmount, tokenOutAmount, poolFee } = params
    const tokenInAddress = await new Token(tokenIn).getAddress()
    const tokenOutAddress = await new Token(tokenOut).getAddress()
    const chain = await Chain.getChain({ chainIdentifier: chainId })
    const uniswapv3LimitOrderAddress = await chain.getAddress("uniswapv3LimitOrder")
    const approveAndExecAddress = await chain.getAddress("approveAndExecAddress")
    const data = encodeAbiParameters(
        [
            {
                type: "tuple",
                components: [{ type: "uint24" }, { type: "address" }, { type: "address" }, { type: "uint256" }, { type: "uint256" }]
            }
        ],
        [[poolFee ?? 3000, tokenInAddress, tokenOutAddress, tokenInAmount, tokenOutAmount]]
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
