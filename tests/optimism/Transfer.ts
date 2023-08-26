import { TransferTest, TransferTestConfig } from "../testUtils/Transfer"

const config: TransferTestConfig = {
    chainId: 10,
    outToken: "dai",
    baseToken: "eth",
    prefundAmt: 0.001
}
TransferTest(config)
