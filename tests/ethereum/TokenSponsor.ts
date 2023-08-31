import { TokenSponsorTest, TokenSponsorTestConfig } from "../testUtils/TokenSponsor"

const config: TokenSponsorTestConfig = {
    chainId: 1,
    paymasterToken: "dai", // Goerli USDC
    baseToken: "eth",
    baseTokenStakeAmt: 0.25,
    mintPaymasterToken: false,
    numRetry: 0,
    paymasterTokensRequired: 10,
    prefundAmt: 0.025
}
TokenSponsorTest(config)
