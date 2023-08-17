import { GroupTest, GroupTestConfig } from "../testUtils/Group"

const config: GroupTestConfig = {
    chainId: 5,
    baseToken: "eth",
    prefundAmt: 0.2
}
GroupTest(config)
