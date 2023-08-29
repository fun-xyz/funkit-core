import { GroupTest, GroupTestConfig } from "../testUtils/Group"

const config: GroupTestConfig = {
    chainId: 42161,
    baseToken: "eth",
    prefundAmt: 0.001
}
GroupTest(config)
