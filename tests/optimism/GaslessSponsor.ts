import { GaslessSponsorTest, GaslessSponsorTestConfig } from "../testUtils/GaslessSponsor"

const config: GaslessSponsorTestConfig = {
    chainId: 10,
    inToken: "eth",
    outToken: "usdc",
    stakeAmount: 0.04,
    amount: 0.0001,
    prefund: true,
    baseToken: "eth"
}
GaslessSponsorTest(config)
