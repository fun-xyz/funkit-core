import { SessionKeyTest, SessionKeyTestConfig } from "../testUtils/SessionKey"

const config: SessionKeyTestConfig = {
    chainId: 36865,
    outToken: "dai",
    baseToken: "eth",
    prefundAmt: 0.035,
    index: 2222
}
SessionKeyTest(config)
