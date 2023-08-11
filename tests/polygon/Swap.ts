import { SwapTest, SwapTestConfig } from "../testUtils/Swap"

const config: SwapTestConfig = {
    chainId: 137,
    inToken: "dai",
    outToken: "wmatic",
    baseToken: "matic",
    prefund: false,
    amount: 0.0001,
    erc20toerc20Amt: 0.00001,
    erc20toethAmt: 0.0001
}
SwapTest(config)
