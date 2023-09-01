import { SwapTest, SwapTestConfig } from "../testUtils/Swap"

const config: SwapTestConfig = {
    chainId: 8453,
    inToken: "dai",
    outToken: "weth",
    baseToken: "eth",
    amount: 0.0001,
    erc20toerc20Amt: 0.00001,
    erc20toethAmt: 0.0001,
    prefundAmt: 0.001
}
SwapTest(config)
