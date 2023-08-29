import { GaslessSponsorTest, GaslessSponsorTestConfig } from "../testUtils/GaslessSponsor"

const config: GaslessSponsorTestConfig = {
    chainId: 137,
    stakeAmount: 1.5,
    baseToken: "matic"
}
GaslessSponsorTest(config)
