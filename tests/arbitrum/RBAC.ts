import { RBACTest, RBACTestConfig } from "../testUtils/RBAC"

const config: RBACTestConfig = {
    chainId: 42161,
    baseToken: "eth",
    prefundAmt: 0.001
}
RBACTest(config)
