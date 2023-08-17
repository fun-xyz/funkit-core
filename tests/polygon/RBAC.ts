import { RBACTest, RBACTestConfig } from "../testUtils/RBAC"

const config: RBACTestConfig = {
    chainId: 137,
    baseToken: "matic"
}
RBACTest(config)
