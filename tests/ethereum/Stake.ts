import { StakeTest, StakeTestConfig } from "../testUtils/Stake"

const config: StakeTestConfig = {
    chainId: 1,
    actualChainId: 1,
    baseToken: "eth",
    prefundAmt: 0.035,
    steth: "0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84",
    stakeAmt: 0.0001
}
StakeTest(config)
