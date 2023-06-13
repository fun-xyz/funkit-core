import { TokenSponsorTest, TokenSponsorTestConfig } from "../testUtils/TokenSponsor"

const config: TokenSponsorTestConfig = {
    chainId: 5,
    inToken: "eth",
    outToken: "dai",
    paymasterToken: "0x07865c6E87B9F70255377e024ace6630C1Eaa37F",
    baseTokenStakeAmt: 0.006,
    paymasterTokenStakeAmt: 100,
    prefund: true,
    swapAmount: 0.001,
    stake: true
}
TokenSponsorTest(config)
