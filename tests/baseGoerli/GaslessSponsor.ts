import { GaslessSponsorTest, GaslessSponsorTestConfig } from "../testUtils/GaslessSponsor"

const config: GaslessSponsorTestConfig = {
    chainId: 84531,
    inToken: "eth",
    outToken: "usdc",
    stakeAmount: 0.5,
    prefund: true
}
GaslessSponsorTest(config)
