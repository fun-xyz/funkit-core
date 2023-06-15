import { SwapTest, SwapTestConfig } from "../testUtils/Swap"

const config: SwapTestConfig = {
    chainId: 36865,
    inToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    outToken: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    baseToken: "eth",
    prefund: true,
    amount: 0.1,
    mint: false,
    prefundAmt: 1,
    slippage: 10
}
SwapTest(config)
