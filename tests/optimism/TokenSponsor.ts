import { TokenSponsorTest, TokenSponsorTestConfig } from "../testUtils/TokenSponsor"

const config: TokenSponsorTestConfig = {
    chainId: 10,
    paymasterToken: "usdc",
    baseToken: "eth",
    baseTokenStakeAmt: 0.01,
    mintPaymasterToken: true,
    numRetry: 0,
    paymasterTokensRequired: 3,
    prefundAmt: 0.005
}
TokenSponsorTest(config)
