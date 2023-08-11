import { TransferTest, TransferTestConfig } from "../testUtils/Transfer"

const config: TransferTestConfig = {
    chainId: 420,
    outToken: "dai",
    baseToken: "eth"
}
TransferTest(config)
