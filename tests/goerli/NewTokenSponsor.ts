import { TokenSponsorTest, TokenSponsorTestConfig } from "../testUtils/NewTokenSponsor"

const config: TokenSponsorTestConfig = {
    chainId: 5,
    paymasterToken: "usdc",
    baseToken: "eth",
    baseTokenStakeAmt: 1,
    mintPaymasterToken: true,
    numRetry: 0,
    paymasterTokensRequired: 1000
}
TokenSponsorTest(config)
