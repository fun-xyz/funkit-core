import { TokenSponsorTest, TokenSponsorTestConfig } from "../testUtils/TokenSponsor"

const config: TokenSponsorTestConfig = {
    chainId: 137,
    inToken: "matic",
    outToken: "dai",
    paymasterToken: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
    baseTokenStakeAmt: 1,
    paymasterTokenStakeAmt: 1,
    prefund: true,
    swapAmount: 0.01,
    stake: true
}

TokenSponsorTest(config)
