import { TokenSponsorTest, TokenSponsorTestConfig } from "../testUtils/TokenSponsor"

const config: TokenSponsorTestConfig = {
    chainId: 8453,
    paymasterToken: "dai",
    baseToken: "eth",
    baseTokenStakeAmt: 0.05,
    mintPaymasterToken: false,
    prefundAmt: 0.055,
    numRetry: 0,
    paymasterTokensRequired: 6
}
TokenSponsorTest(config)
