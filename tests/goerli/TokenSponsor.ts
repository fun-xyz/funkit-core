import { TokenSponsorTest, TokenSponsorTestConfig } from "../testUtils/TokenSponsor"

const config: TokenSponsorTestConfig = {
    chainId: 5,
    paymasterToken: "0x4dF8d8AA018cABB7c1194E6Df064961ea3572c48",
    baseToken: "eth",
    baseTokenStakeAmt: 1,
    mintPaymasterToken: true,
    numRetry: 0,
    paymasterTokensRequired: 1000,
    prefundAmt: 0.005
}
TokenSponsorTest(config)
