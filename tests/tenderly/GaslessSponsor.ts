import { GaslessSponsorTest, GaslessSponsorTestConfig } from "../testUtils/GaslessSponsor"

const config: GaslessSponsorTestConfig = {
    chainId: 36865,
    stakeAmount: 10,
    baseToken: "eth",
    sponsorBalance: 0.1
}
GaslessSponsorTest(config)
