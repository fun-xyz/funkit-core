import { SwapTest, SwapTestConfig } from "../testUtils/Swap"

const config: SwapTestConfig = {
    chainId: 5,
    inToken: "dai",
    outToken: "weth",
    baseToken: "eth",
    prefund: true,
    amount: 10_000
}
SwapTest(config)
