import { SwapTest, SwapTestConfig } from "../testUtils/Swap"

const config: SwapTestConfig = {
    chainId: 420,
    inToken: "usdc",
    outToken: "weth",
    baseToken: "eth",
    prefund: true,
    amount: 1000
}
SwapTest(config)
