import { TokenSponsorTest, TokenSponsorTestConfig } from "../testUtils/TokenSponsor"

const config: TokenSponsorTestConfig = {
    chainId: 36865,
    paymasterToken: "usdc",
    baseToken: "eth",
    baseTokenStakeAmt: 0.01,
    mintPaymasterToken: true,
    numRetry: 0,
    prefundAmt: 0.005,
    paymasterTokensRequired: 3
}
TokenSponsorTest(config)
