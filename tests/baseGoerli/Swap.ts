import { SwapTest, SwapTestConfig } from "../testUtils/Swap"

const config: SwapTestConfig = {
    chainId: 36865,
    inToken: "usdc",
    outToken: "dai",
    baseToken: "weth",
    prefund: true,
    amount: 1000
}
SwapTest(config)
