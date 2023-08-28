import { TokenSponsorTest, TokenSponsorTestConfig } from "../testUtils/TokenSponsor"

const config: TokenSponsorTestConfig = {
    chainId: 5,
    inToken: "usdc",
    outToken: "dai",
    paymasterToken: "0x4dF8d8AA018cABB7c1194E6Df064961ea3572c48",
    baseToken: "eth",
    baseTokenStakeAmt: 0.2,
    paymasterTokenStakeAmt: 100,
    prefund: true,
    swapAmount: 0.001,
    stake: true,
    mint: true
}
TokenSponsorTest(config)
