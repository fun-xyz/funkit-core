import { TokenSponsorTest, TokenSponsorTestConfig } from "../testUtils/TokenSponsor"

const config: TokenSponsorTestConfig = {
    chainId: 420,
    inToken: "eth",
    outToken: "dai",
    paymasterToken: "0x07865c6E87B9F70255377e024ace6630C1Eaa37F",
    baseTokenStakeAmt: 0.006,
    paymasterTokenStakeAmt: 100,
    prefund: false,
    swapAmount: 0.001,
    stake: false
}
TokenSponsorTest(config)
