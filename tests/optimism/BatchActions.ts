import { BatchActionsTest, BatchActionsTestConfig } from "../testUtils/BatchActions"

const config: BatchActionsTestConfig = {
    chainId: 10,
    baseToken: "eth",
    outToken: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",
    prefundAmt: 0.0001
}
BatchActionsTest(config)
