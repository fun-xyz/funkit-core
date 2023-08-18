import { GroupTest, GroupTestConfig } from "../testUtils/Group"

const config: GroupTestConfig = {
    chainId: 137,
    baseToken: "matic",
    prefundAmt: 0.2
}
GroupTest(config)
