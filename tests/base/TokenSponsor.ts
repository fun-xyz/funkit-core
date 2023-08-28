import { TokenSponsorTest, TokenSponsorTestConfig } from "../testUtils/TokenSponsor"

const config: TokenSponsorTestConfig = {
    chainId: 8453,
    paymasterToken: "dai",
    baseToken: "eth",
    baseTokenStakeAmt: 0.01,
    mintPaymasterToken: true,
    prefundAmt: 0.005,
    numRetry: 0,
    paymasterTokensRequired: 3
}
TokenSponsorTest(config)
