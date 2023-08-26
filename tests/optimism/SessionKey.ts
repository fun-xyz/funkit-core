import { SessionKeyTest, SessionKeyTestConfig } from "../testUtils/SessionKey"

const config: SessionKeyTestConfig = {
    chainId: 10,
    outToken: "dai",
    baseToken: "eth",
    prefundAmt: 0.0001
}
SessionKeyTest(config)
