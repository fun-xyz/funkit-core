import { StakeTest, StakeTestConfig } from "../testUtils/Stake"

const config: StakeTestConfig = {
    chainId: 5,
    actualChainId: 5,
    baseToken: "eth",
    prefundAmt: 0.2,
    steth: "0x1643E812aE58766192Cf7D2Cf9567dF2C37e9B7F"
}
StakeTest(config)
