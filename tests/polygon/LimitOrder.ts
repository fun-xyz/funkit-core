import { LimitOrderConfig, LimitOrderTest } from "../testUtils/LimitOrder"

const config: LimitOrderConfig = {
    chainId: 137,
    outToken: "dai",
    baseToken: "matic",
    tokenInAmount: 0.001,
    tokenOutAmount: 0.00001,
    prefundAmt: 1
}
LimitOrderTest(config)
