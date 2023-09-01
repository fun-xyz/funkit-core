import { LimitOrderConfig, LimitOrderTest } from "../testUtils/LimitOrder"

const config: LimitOrderConfig = {
    chainId: 36865,
    outToken: "dai",
    baseToken: "eth",
    tokenInAmount: 0.001,
    tokenOutAmount: 0.00001,
    prefundAmt: 0.25
}
LimitOrderTest(config)
