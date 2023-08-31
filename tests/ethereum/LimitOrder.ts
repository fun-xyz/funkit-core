import { LimitOrderConfig, LimitOrderTest } from "../testUtils/LimitOrder"

const config: LimitOrderConfig = {
    chainId: 1,
    outToken: "dai",
    baseToken: "eth",
    tokenInAmount: 0.001,
    tokenOutAmount: 0.00001,
    prefundAmt: 0.025
}
LimitOrderTest(config)
