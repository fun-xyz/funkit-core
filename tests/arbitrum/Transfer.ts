import { TransferTest, TransferTestConfig } from "../testUtils/Transfer"

const config: TransferTestConfig = {
    chainId: 42161,
    outToken: "usdc",
    baseToken: "eth",
    index: 0,
    amount: 0.000001,
    prefundAmt: 0.001,
    outTokenPrefund: 0.00001
}

TransferTest(config)
