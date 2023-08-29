import { TokenSponsorTest, TokenSponsorTestConfig } from "../testUtils/TokenSponsor"

const config: TokenSponsorTestConfig = {
    chainId: 42161,
    paymasterToken: "usdc",
    baseToken: "eth",
    baseTokenStakeAmt: 0.004,
    mintPaymasterToken: false,
    numRetry: 0,
    paymasterTokensRequired: 3,
    prefundAmt: 0.005
}
TokenSponsorTest(config)
