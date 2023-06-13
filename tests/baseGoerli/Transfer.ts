import { TransferTest, TransferTestConfig } from "../testUtils/Transfer"

const config: TransferTestConfig = {
    chainId: 36865,
    outToken: "dai",
    baseToken: "eth",
    prefund: false
}
TransferTest(config)
