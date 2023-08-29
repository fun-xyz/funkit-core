import { RBACTest, RBACTestConfig } from "../testUtils/RBAC"

const config: RBACTestConfig = {
    chainId: 10,
    baseToken: "eth",
    prefundAmt: 0.005
}
RBACTest(config)
