import { SessionKeyTest, SessionKeyTestConfig } from "../testUtils/SessionKey"

const config: SessionKeyTestConfig = {
    chainId: 137,
    outToken: "dai",
    baseToken: "matic",
    prefundAmt: 0.2
}
SessionKeyTest(config)
