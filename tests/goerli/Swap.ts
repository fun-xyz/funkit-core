import { SwapTest, SwapTestConfig } from "../testUtils/Swap"

const config: SwapTestConfig = {
    chainId: 5,
    inToken: "dai",
    outToken: "weth",
    baseToken: "eth",
    prefund: false,
    amount: 0.0001
}
SwapTest(config)
