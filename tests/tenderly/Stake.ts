import { StakeTest, StakeTestConfig } from "../testUtils/Stake"

const config: StakeTestConfig = {
    chainId: 36865,
    actualChainId: 1, //mainnet since we are using tenderly to fork mainnet
    baseToken: "eth",
    prefundAmt: 0.2,
    steth: "0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84",
    stakeAmt: 0.01
}
StakeTest(config)
