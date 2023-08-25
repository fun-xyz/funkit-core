import { TransferTest, TransferTestConfig } from "../testUtils/Transfer"

const config: TransferTestConfig = {
    chainId: 137,
    outToken: "usdc",
    baseToken: "eth",
    prefundAmt: 1,
    amount: 0.0001,
    outTokenPrefund: 0.0001
}
TransferTest(config)
