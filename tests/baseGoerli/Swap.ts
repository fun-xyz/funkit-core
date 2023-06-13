import { SwapTest, SwapTestConfig } from "../testUtils/Swap"

const config: SwapTestConfig = {
    chainId: 84531,
    inToken: "usdc",
    outToken: "dai",
    baseToken: "weth",
    prefund: true,
    amount: 1000
}
SwapTest(config)
