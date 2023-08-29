import { TokenSponsorTest, TokenSponsorTestConfig } from "../testUtils/TokenSponsor"

const config: TokenSponsorTestConfig = {
    chainId: 137,
    paymasterToken: "usdc",
    baseToken: "matic",
    baseTokenStakeAmt: 1,
    mintPaymasterToken: false,
    numRetry: 0,
    prefundAmt: 1.5,
    paymasterTokensRequired: 3
}
TokenSponsorTest(config)
