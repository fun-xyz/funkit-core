import { RBACTest, RBACTestConfig } from "../testUtils/RBAC"

const config: RBACTestConfig = {
    chainId: 8453,
    baseToken: "eth",
    prefundAmt: 0.02
}
RBACTest(config)
