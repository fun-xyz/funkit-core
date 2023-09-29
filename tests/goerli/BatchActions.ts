import { BatchActionsTest, BatchActionsTestConfig } from "../testUtils/BatchActions"

const config: BatchActionsTestConfig = {
    chainId: 5,
    outToken: "dai",
    baseToken: "eth",
    prefundAmt: 0.2,
    index: 123123
}
BatchActionsTest(config)
