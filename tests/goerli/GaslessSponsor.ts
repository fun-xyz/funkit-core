import { GaslessSponsorTest, GaslessSponsorTestConfig } from "../testUtils/GaslessSponsor"

const config: GaslessSponsorTestConfig = {
    chainId: 5,
    stakeAmount: 0.5,
    baseToken: "eth",
    walletIndex: 1212313123,
    funderIndex: 1212313456
}
GaslessSponsorTest(config)
