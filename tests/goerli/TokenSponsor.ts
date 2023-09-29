import { TokenSponsorTest, TokenSponsorTestConfig } from "../testUtils/TokenSponsor"

const config: TokenSponsorTestConfig = {
    chainId: 5,
    paymasterToken: "0xdB6eCe914a89b1cd11454B99b8BC7F54b04CcF5e", // Goerli USDC
    baseToken: "eth",
    baseTokenStakeAmt: 1,
    mintPaymasterToken: true,
    numRetry: 0,
    paymasterTokensRequired: 1000,
    prefundAmt: 0.005,
    walletIndex: 1231238987123
}
TokenSponsorTest(config)
