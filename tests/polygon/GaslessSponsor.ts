import { GaslessSponsorTest, GaslessSponsorTestConfig } from "../testUtils/GaslessSponsor"

const config: GaslessSponsorTestConfig = {
    chainId: 137,
    stakeAmount: 3,
    baseToken: "matic",
    sponsorBalance: 1
}
GaslessSponsorTest(config)
