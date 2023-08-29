import { GroupTest, GroupTestConfig } from "../testUtils/Group"

const config: GroupTestConfig = {
    chainId: 10,
    baseToken: "eth",
    prefundAmt: 0.005
}
GroupTest(config)
