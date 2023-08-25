import { TokenSponsorTest, TokenSponsorTestConfig } from "../testUtils/TokenSponsor"

const config: TokenSponsorTestConfig = {
    chainId: 137,
    inToken: "usdc",
    outToken: "dai",
    paymasterToken: "usdc",
    baseToken: "matic",
    baseTokenStakeAmt: 1,
    prefundAmt: 2,
    paymasterTokenStakeAmt: 0.1,
    prefund: true,
    swapAmount: 0.001,
    amount: 0.5,
    stake: true,
    mint: false
}
TokenSponsorTest(config)
