import { StakeTest, StakeTestConfig } from "../testUtils/Stake"

const config: StakeTestConfig = {
    chainId: 420,
    baseToken: "eth",
    prefund: false,
    steth: "0x1643E812aE58766192Cf7D2Cf9567dF2C37e9B7F"
}
StakeTest(config)
