import { SwapTest, SwapTestConfig } from "../testUtils/Swap"

const config: SwapTestConfig = {
    chainId: 5,
    inToken: "dai",
    outToken: "weth",
    baseToken: "eth",
    amount: 0.001,
    prefundAmt: 0.2,
    index: 123123
}
SwapTest(config)
