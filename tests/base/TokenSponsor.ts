import { TokenSponsorTest, TokenSponsorTestConfig } from "../testUtils/TokenSponsor"

const config: TokenSponsorTestConfig = {
    chainId: 8453,
    paymasterToken: "dai",
    baseToken: "eth",
    baseTokenStakeAmt: 0.005,
    mintPaymasterToken: false,
    prefundAmt: 0.0055,
    numRetry: 0,
    paymasterTokensRequired: 6
}
TokenSponsorTest(config)
