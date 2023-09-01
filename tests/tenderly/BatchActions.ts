import { BatchActionsTest, BatchActionsTestConfig } from "../testUtils/BatchActions"

const config: BatchActionsTestConfig = {
    chainId: 36865,
    outToken: "dai",
    baseToken: "eth",
    prefundAmt: 0.2
}
BatchActionsTest(config)
