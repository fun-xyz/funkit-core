import { BatchActionsTest, BatchActionsTestConfig } from "../testUtils/BatchActions"

const config: BatchActionsTestConfig = {
    chainId: 5,
    outToken: "dai",
    baseToken: "eth",
    prefund: true
}
BatchActionsTest(config)
