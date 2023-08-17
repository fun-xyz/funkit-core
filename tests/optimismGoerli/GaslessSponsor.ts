import { GaslessSponsorTest, GaslessSponsorTestConfig } from "../testUtils/GaslessSponsor"

const config: GaslessSponsorTestConfig = {
    chainId: 420,
    inToken: "eth",
    outToken: "usdc",
    stakeAmount: 0.5,
    prefund: true,
    baseToken: "eth"
}
GaslessSponsorTest(config)
