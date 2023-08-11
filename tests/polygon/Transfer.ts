import { TransferTest, TransferTestConfig } from "../testUtils/Transfer"

const config: TransferTestConfig = {
    chainId: 137,
    outToken: "usdc",
    baseToken: "eth",
    prefund: true
}
TransferTest(config)
