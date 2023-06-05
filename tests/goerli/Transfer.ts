import { TransferTest, TransferTestConfig } from "../testUtils/Transfer"

const config: TransferTestConfig = {
    chainId: 5,
    outToken: "dai",
    baseToken: "eth",
    prefund: true
}
TransferTest(config)
