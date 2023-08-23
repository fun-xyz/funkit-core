import { SessionKeyTest, SessionKeyTestConfig } from "../testUtils/SessionKey"

const config: SessionKeyTestConfig = {
    chainId: 10,
    outToken: "0x712110295e4eCc0F46dC06684AA21263613b08dd",
    baseToken: "eth",
    prefundAmt: 0.0001
}
SessionKeyTest(config)
