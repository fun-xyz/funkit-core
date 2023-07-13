import { TokenSponsorTest, TokenSponsorTestConfig } from "../testUtils/TokenSponsor"

const config: TokenSponsorTestConfig = {
    chainId: 36865,
    inToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    outToken: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    paymasterToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    walletIndex: 5032,
    funderIndex: 132123,
    baseTokenStakeAmt: 1,
    paymasterTokenStakeAmt: 100,
    prefund: true,
    prefundAmt: 10,
    swapAmount: 1,
    stake: true,
    mint: true,
    batchTokenAddress: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
    numRetry: 0
}
TokenSponsorTest(config)
