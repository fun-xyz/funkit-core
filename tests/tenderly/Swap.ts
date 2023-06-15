import { SwapTest, SwapTestConfig } from "../testUtils/Swap"

const config: SwapTestConfig = {
    chainId: 36865,
    inToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    outToken: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
    baseToken: "eth",
    prefund: true,
    amount: 1,
    mint: false,
    prefundAmt: 10
}
SwapTest(config)
