import { RBACTest, RBACTestConfig } from "../testUtils/RBAC"

const config: RBACTestConfig = {
    chainId: 137,
    baseToken: "matic",
    prefundAmt: 0.2
}
RBACTest(config)
