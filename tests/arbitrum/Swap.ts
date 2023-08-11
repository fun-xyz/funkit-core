import { SwapTest, SwapTestConfig } from "../testUtils/Swap"

const config: SwapTestConfig = {
    chainId: 42161,
    inToken: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",
    outToken: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
    baseToken: "eth",
    amount: 0.00001,
    prefundAmt: 0.002,
    index: 0
}

SwapTest(config)
