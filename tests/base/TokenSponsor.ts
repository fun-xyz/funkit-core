import { TokenSponsorTest, TokenSponsorTestConfig } from "../testUtils/TokenSponsor"

const config: TokenSponsorTestConfig = {
    chainId: 8453,
    paymasterToken: "dai",
    baseToken: "eth",
    baseTokenStakeAmt: 0.02,
    mintPaymasterToken: false,
    prefundAmt: 0.025,
    numRetry: 0,
    paymasterTokensRequired: 3
}
TokenSponsorTest(config)
