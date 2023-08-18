import { RBACTest, RBACTestConfig } from "../testUtils/RBAC"

const config: RBACTestConfig = {
    chainId: 5,
    baseToken: "eth",
    prefundAmt: 0.1
}
RBACTest(config)
