import { TokenSponsorTest, TokenSponsorTestConfig } from "../testUtils/TokenSponsor"

const config: TokenSponsorTestConfig = {
    chainId: 137,
    inToken: "usdc",
    outToken: "dai",
    paymasterToken: "usdc",
    baseTokenStakeAmt: 0.2,
    paymasterTokenStakeAmt: 0.1,
    prefund: false,
    swapAmount: 0.001,
    stake: true,
    mint: false
}
TokenSponsorTest(config)
