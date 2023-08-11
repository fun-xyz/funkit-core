import { GaslessSponsorTest, GaslessSponsorTestConfig } from "../testUtils/GaslessSponsor"

const config: GaslessSponsorTestConfig = {
    chainId: 10,
    inToken: "eth",
    outToken: "usdc",
    stakeAmount: 0.0005,
    amount: 0.00001,
    prefundAmt: 0.00001,
    prefund: true
}
GaslessSponsorTest(config)
