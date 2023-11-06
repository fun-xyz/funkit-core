import { SwapTest, SwapTestConfig } from "../testUtils/Swap"

const config: SwapTestConfig = {
    chainId: 36865,
    inToken: "dai",
    outToken: "weth",
    baseToken: "eth",
    amount: 0.000000001,
    prefundAmt: 1
}
SwapTest(config)
