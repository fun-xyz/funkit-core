import { SwapTest, SwapTestConfig } from "../testUtils/Swap"

const config: SwapTestConfig = {
    chainId: 420,
    inToken: "dai",
    outToken: "weth",
    baseToken: "eth",
    prefund: false
}
SwapTest(config)
