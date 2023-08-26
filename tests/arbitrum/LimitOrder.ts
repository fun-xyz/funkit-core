import { LimitOrderConfig, LimitOrderTest } from "../testUtils/LimitOrder"

const config: LimitOrderConfig = {
    chainId: 42161,
    outToken: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",
    baseToken: "eth",
    tokenInAmount: 0.00001,
    tokenOutAmount: 0.00001,
    prefundAmt: 0.001
}
LimitOrderTest(config)
