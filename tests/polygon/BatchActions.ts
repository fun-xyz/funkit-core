import { BatchActionsTest, BatchActionsTestConfig } from "../testUtils/BatchActions"

const config: BatchActionsTestConfig = {
    chainId: 137,
    outToken: "dai",
    baseToken: "matic",
    prefundAmt: 1
}
BatchActionsTest(config)
