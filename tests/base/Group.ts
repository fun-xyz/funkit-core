import { GroupTest, GroupTestConfig } from "../testUtils/Group"

const config: GroupTestConfig = {
    chainId: 8453,
    baseToken: "eth",
    prefundAmt: 0.008
}
GroupTest(config)
