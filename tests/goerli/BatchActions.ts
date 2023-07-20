import { BatchActionsTest, BatchActionsTestConfig } from "../testUtils/BatchActions"

const config: BatchActionsTestConfig = {
    chainId: 5,
    outToken: "0x712110295e4eCc0F46dC06684AA21263613b08dd",
    baseToken: "eth",
    prefund: false
}
BatchActionsTest(config)
