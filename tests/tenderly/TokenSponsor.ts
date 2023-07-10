import { TokenSponsorTest, TokenSponsorTestConfig } from "../testUtils/TokenSponsor"

const config: TokenSponsorTestConfig = {
    chainId: 36865,
    inToken: "eth",
    outToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    paymasterToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    walletIndex: 5032,
    funderIndex: 132123,
    baseTokenStakeAmt: 1,
    paymasterTokenStakeAmt: 100,
    prefund: true,
    prefundAmt: 10,
    swapAmount: 1,
    stake: true,
    mint: false,
    batchTokenAddress: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
    numRetry: 0
}
TokenSponsorTest(config)
