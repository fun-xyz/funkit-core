import { GaslessSponsorTest, GaslessSponsorTestConfig } from "../testUtils/GaslessSponsor"

const config: GaslessSponsorTestConfig = {
    chainId: 137,
    inToken: "matic",
    outToken: "usdc",
    stakeAmount: 1,
    prefund: true
}

GaslessSponsorTest(config)
