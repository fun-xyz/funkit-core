import { GaslessSponsorTest, GaslessSponsorTestConfig } from "../testUtils/GaslessSponsor"

const config: GaslessSponsorTestConfig = {
    chainId: 137,
    inToken: "eth",
    outToken: "usdc",
    stakeAmount: 0.5,
    prefund: false
}
GaslessSponsorTest(config)
