import { SessionKeyTest, SessionKeyTestConfig } from "../testUtils/SessionKey"

const config: SessionKeyTestConfig = {
    chainId: 137,
    outToken: "dai",
    baseToken: "eth",
    prefund: false
}
SessionKeyTest(config)
