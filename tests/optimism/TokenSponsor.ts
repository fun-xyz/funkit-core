import { TokenSponsorTest, TokenSponsorTestConfig } from "../testUtils/TokenSponsor"

const config: TokenSponsorTestConfig = {
    chainId: 10,
    inToken: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",
    outToken: "usdc",
    paymasterToken: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",
    baseTokenStakeAmt: 0.0002,
    paymasterTokenStakeAmt: 0.8,
    prefund: true,
    swapAmount: 0.001,
    stake: true,
    mint: false
}
TokenSponsorTest(config)