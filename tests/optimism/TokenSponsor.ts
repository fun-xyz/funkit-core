import { TokenSponsorTest, TokenSponsorTestConfig } from "../testUtils/TokenSponsor"

const config: TokenSponsorTestConfig = {
    chainId: 10,
    paymasterToken: "usdc",
    baseToken: "eth",
    baseTokenStakeAmt: 0.005,
    mintPaymasterToken: false,
    numRetry: 0,
    paymasterTokensRequired: 6,
    prefundAmt: 0.0055
}
TokenSponsorTest(config)
