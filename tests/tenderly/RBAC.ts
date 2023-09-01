import { RBACTest, RBACTestConfig } from "../testUtils/RBAC"

const config: RBACTestConfig = {
    chainId: 36865,
    baseToken: "eth",
    prefundAmt: 0.2
}
RBACTest(config)
