import { BatchActionsTest, BatchActionsTestConfig } from "../testUtils/BatchActions"

const config: BatchActionsTestConfig = {
    chainId: 137,
    outToken: "0xA31309b1915f21d6ec8C7811f79158dF2Db8ccb3",
    baseToken: "matic",
    prefundAmt: 1
}
BatchActionsTest(config)
