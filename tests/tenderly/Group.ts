import { GroupTest, GroupTestConfig } from "../testUtils/Group"

const config: GroupTestConfig = {
    chainId: 36865,
    baseToken: "eth",
    prefundAmt: 0.25
}
GroupTest(config)
