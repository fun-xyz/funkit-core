import { GroupTest, GroupTestConfig } from "../testUtils/Group"

const config: GroupTestConfig = {
    chainId: 10,
    baseToken: "eth",
    prefundAmt: 0.0001
}
GroupTest(config)
