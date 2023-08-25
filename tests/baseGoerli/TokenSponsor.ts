import { TokenSponsorTest, TokenSponsorTestConfig } from "../testUtils/TokenSponsor"

const config: TokenSponsorTestConfig = {
    chainId: 84531,
    inToken: "usdc",
    outToken: "dai",
    paymasterToken: "usdc",
    baseTokenStakeAmt: 0.3,
    paymasterTokenStakeAmt: 100,
    baseToken: "eth",
    prefund: false,
    swapAmount: 0.001,
    stake: false
}
TokenSponsorTest(config)
