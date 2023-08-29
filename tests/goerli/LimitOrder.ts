import { LimitOrderConfig, LimitOrderTest } from "../testUtils/LimitOrder"

const config: LimitOrderConfig = {
    chainId: 5,
    outToken: "dai",
    baseToken: "usdc",
    tokenInAmount: 100,
    tokenOutAmount: 1,
    prefundAmt: 0.2
}
LimitOrderTest(config)
