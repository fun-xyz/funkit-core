import { GroupTest, GroupTestConfig } from "../testUtils/Group"

const config: GroupTestConfig = {
    chainId: 1,
    baseToken: "eth",
    prefundAmt: 0.025
}
GroupTest(config)
