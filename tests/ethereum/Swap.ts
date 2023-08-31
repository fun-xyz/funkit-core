import { SwapTest, SwapTestConfig } from "../testUtils/Swap"

const config: SwapTestConfig = {
    chainId: 1,
    inToken: "dai",
    outToken: "weth",
    baseToken: "eth",
    amount: 0.00001,
    prefundAmt: 0.035,
    index: 0
}

SwapTest(config)
