import { SwapTest, SwapTestConfig } from "../testUtils/Swap"

const config: SwapTestConfig = {
    chainId: 36865,
    inToken: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
    outToken: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    baseToken: "eth",
    prefund: true,
    amount: 0.1,
    mint: false,
    prefundAmt: 1,
    slippage: 10,
    numRetry: 0
}
SwapTest(config)
