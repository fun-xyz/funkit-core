import { SessionKeyTest, SessionKeyTestConfig } from "../testUtils/SessionKey"

const config: SessionKeyTestConfig = {
    chainId: 8453,
    outToken: "dai",
    baseToken: "eth",
    prefundAmt: 0.01
}
SessionKeyTest(config)
