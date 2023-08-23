import { BatchActionsTest, BatchActionsTestConfig } from "../testUtils/BatchActions"

const config: BatchActionsTestConfig = {
    chainId: 137,
    outToken: "dai",
    baseToken: "matic",
    prefundAmt: 0.2
}
BatchActionsTest(config)
