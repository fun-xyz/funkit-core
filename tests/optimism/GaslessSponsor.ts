import { GaslessSponsorTest, GaslessSponsorTestConfig } from "../testUtils/GaslessSponsor"

const config: GaslessSponsorTestConfig = {
    chainId: 10,
    stakeAmount: 0.04,
    baseToken: "eth"
}
GaslessSponsorTest(config)
