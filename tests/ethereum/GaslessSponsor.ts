import { GaslessSponsorTest, GaslessSponsorTestConfig } from "../testUtils/GaslessSponsor"

const config: GaslessSponsorTestConfig = {
    chainId: 1,
    stakeAmount: 0.2,
    baseToken: "eth",
    sponsorBalance: 0.04
}
GaslessSponsorTest(config)
