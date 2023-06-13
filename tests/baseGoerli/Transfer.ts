import { TransferTest, TransferTestConfig } from "../testUtils/Transfer"

const config: TransferTestConfig = {
    chainId: 84531,
    outToken: "dai",
    baseToken: "eth",
    prefund: false
}
TransferTest(config)
