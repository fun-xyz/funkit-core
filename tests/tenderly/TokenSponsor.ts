import { TokenSponsorTest, TokenSponsorTestConfig } from "../testUtils/TokenSponsor"

const config: TokenSponsorTestConfig = {
    chainId: 36865,
    paymasterToken: "dai",
    baseToken: "eth",
    baseTokenStakeAmt: 0.25,
    mintPaymasterToken: false,
    numRetry: 0,
    paymasterTokensRequired: 500,
    prefundAmt: 0.2
}
TokenSponsorTest(config)
