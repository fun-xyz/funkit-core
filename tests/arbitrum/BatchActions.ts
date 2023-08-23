import { BatchActionsTest, BatchActionsTestConfig } from "../testUtils/BatchActions"

const config: BatchActionsTestConfig = {
    chainId: 42161,
    outToken: "dai",
    baseToken: "eth",
    prefundAmt: 0.0003
}
BatchActionsTest(config)
