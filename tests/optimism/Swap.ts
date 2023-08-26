import { SwapTest, SwapTestConfig } from "../testUtils/Swap"

const config: SwapTestConfig = {
    chainId: 10,
    inToken: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",
    outToken: "0x4200000000000000000000000000000000000006",
    baseToken: "eth",
    amount: 0.000001,
    prefundAmt: 0.005
}
SwapTest(config)
