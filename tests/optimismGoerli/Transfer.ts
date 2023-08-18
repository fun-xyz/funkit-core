import { TransferTest, TransferTestConfig } from "../testUtils/Transfer"

const config: TransferTestConfig = {
    chainId: 420,
    outToken: "dai",
    baseToken: "eth",
    prefundAmt: 0.2
}
TransferTest(config)
