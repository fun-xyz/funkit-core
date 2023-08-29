import { GaslessSponsorTest, GaslessSponsorTestConfig } from "../testUtils/GaslessSponsor"

const config: GaslessSponsorTestConfig = {
    chainId: 5,
    stakeAmount: 0.5,
    baseToken: "eth"
}
GaslessSponsorTest(config)
