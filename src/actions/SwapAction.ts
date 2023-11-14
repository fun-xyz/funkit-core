import { Action } from "./Action"
import { uniswapV3SwapTransactionParams } from "./Swap"
import { SwapParams, TransactionParams } from "./types"
import { GlobalEnvOption } from "../config"
import { Chain, Token } from "../data"

export class SwapAction extends Action {
    override txOptions: GlobalEnvOption
    constructor(options: GlobalEnvOption) {
        super(options)
        this.txOptions = options
    }

    async uniswapV3SwapTransactionParams(params: SwapParams): Promise<TransactionParams> {
        const chain = await Chain.getChain({ chainIdentifier: this.txOptions.chain }, this.txOptions.apiKey)
        if (!(params.tokenIn instanceof Token)) {
            params.tokenIn = await new Token(params.tokenIn, chain, "0x", this.txOptions.apiKey)
        }
        if (!(params.tokenOut instanceof Token)) {
            params.tokenOut = await new Token(params.tokenOut, chain, "0x", this.txOptions.apiKey)
        }
        return await uniswapV3SwapTransactionParams(params, chain)
    }
}
