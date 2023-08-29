import { GroupTest, GroupTestConfig } from "../testUtils/Group"

const config: GroupTestConfig = {
    chainId: 137,
    baseToken: "matic",
    prefundAmt: 1
}
GroupTest(config)
