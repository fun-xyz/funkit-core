import { encodeAbiParameters } from "viem"
import { LimitOrderParam } from "./types"
import { TransactionParams, UNISWAP_V3_LIMIT_ORDER_CONTRACT_INTERFACE } from "../common"
import { Chain, Token } from "../data"

export const LimitOrderTransactionParams = async (
    params: LimitOrderParam,
    chainId: string | Chain | number
): Promise<TransactionParams> => {
    const { tokenIn, tokenOut, tokenInAmount, tokenOutAmount, poolFee } = params
    const tokenInAddress = await new Token(tokenIn).getAddress()
    const tokenOutAddress = await new Token(tokenOut).getAddress()
    const chain = await Chain.getChain({ chainIdentifier: chainId })
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
    return UNISWAP_V3_LIMIT_ORDER_CONTRACT_INTERFACE.encodeTransactionParams(approveAndExecAddress, "execute", [data])
}
