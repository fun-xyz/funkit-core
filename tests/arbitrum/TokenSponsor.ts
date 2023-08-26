import { TokenSponsorTest, TokenSponsorTestConfig } from "../testUtils/TokenSponsor"

const config: TokenSponsorTestConfig = {
    chainId: 42161,
    inToken: "usdc",
    outToken: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",
    paymasterToken: "usdc",
    baseTokenStakeAmt: 0.002,
    paymasterTokenStakeAmt: 1,
    baseToken: "eth",
    prefund: true,
    swapAmount: 0.00001,
    amount: 0.000001,
    prefundAmt: 0.005,
    stake: true,
    walletIndex: 0,
    funderIndex: 1
}

TokenSponsorTest(config)
