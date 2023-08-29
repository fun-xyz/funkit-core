import { TransferTest, TransferTestConfig } from "../testUtils/Transfer"

const config: TransferTestConfig = {
    chainId: 10,
    outToken: "dai",
    baseToken: "eth",
    prefundAmt: 0.005,
    outTokenPrefund: 0.0001
}
TransferTest(config)
