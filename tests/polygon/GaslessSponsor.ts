import { GaslessSponsorTest, GaslessSponsorTestConfig } from "../testUtils/GaslessSponsor"

const config: GaslessSponsorTestConfig = {
    chainId: 137,
    inToken: "matic",
    outToken: "usdc",
    stakeAmount: 0.002,
    prefund: false
}
GaslessSponsorTest(config)
