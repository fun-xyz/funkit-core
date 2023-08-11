import { TransferTest, TransferTestConfig } from "../testUtils/Transfer"

const config: TransferTestConfig = {
    chainId: 5,
    outToken: "0x712110295e4eCc0F46dC06684AA21263613b08dd",
    baseToken: "eth",
    prefundAmt: 0.2
}
TransferTest(config)
