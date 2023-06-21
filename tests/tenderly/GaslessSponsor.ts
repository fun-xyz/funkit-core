import { GaslessSponsorTest, GaslessSponsorTestConfig } from "../testUtils/GaslessSponsor"

const config: GaslessSponsorTestConfig = {
    chainId: 36865,
    inToken: "eth",
    outToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    stakeAmount: 10,
    prefund: true,
    mint: false,
    numRetry: 5
}
GaslessSponsorTest(config)
