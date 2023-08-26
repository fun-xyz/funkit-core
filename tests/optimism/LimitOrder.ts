import { LimitOrderConfig, LimitOrderTest } from "../testUtils/LimitOrder"

const config: LimitOrderConfig = {
    chainId: 10,
    outToken: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",
    baseToken: "eth",
    tokenInAmount: 0.0001,
    tokenOutAmount: 0.000001,
    prefundAmt: 0.005,
    index: 1
}
LimitOrderTest(config)
