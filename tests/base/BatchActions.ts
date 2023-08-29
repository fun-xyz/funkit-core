import { BatchActionsTest, BatchActionsTestConfig } from "../testUtils/BatchActions"

const config: BatchActionsTestConfig = {
    chainId: 8453,
    outToken: "dai",
    baseToken: "eth",
    prefundAmt: 0.025
}
BatchActionsTest(config)
