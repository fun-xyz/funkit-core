import { TokenSponsorTest, TokenSponsorTestConfig } from "../testUtils/TokenSponsor"

const config: TokenSponsorTestConfig = {
    chainId: 420,
    inToken: "usdc",
    outToken: "dai",
    paymasterToken: "usdc",
    baseToken: "eth",
    baseTokenStakeAmt: 0.006,
    paymasterTokenStakeAmt: 100,
    prefund: true,
    swapAmount: 0.001,
    stake: false
}
TokenSponsorTest(config)
