import { RBACTest, RBACTestConfig } from "../testUtils/RBAC"

const config: RBACTestConfig = {
    chainId: 1,
    baseToken: "eth",
    prefundAmt: 0.025
}
RBACTest(config)
