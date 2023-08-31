import { TransferTest, TransferTestConfig } from "../testUtils/Transfer"

const config: TransferTestConfig = {
    chainId: 1,
    outToken: "usdc",
    baseToken: "eth",
    prefundAmt: 0.035,
    index: 222222,
    amount: 0.000001,
    outTokenPrefund: 0.00001
}
TransferTest(config)
