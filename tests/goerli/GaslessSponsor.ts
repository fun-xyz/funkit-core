import { GaslessSponsorTest, GaslessSponsorTestConfig } from "../testUtils/GaslessSponsor"

const config: GaslessSponsorTestConfig = {
    chainId: 5,
    inToken: "eth",
    outToken: "usdc",
    stakeAmount: 0.5,
    baseToken: "eth",
    prefund: false
}
GaslessSponsorTest(config)
