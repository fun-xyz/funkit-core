import { TokenSponsorTest, TokenSponsorTestConfig } from "../testUtils/TokenSponsor"

const config: TokenSponsorTestConfig = {
    chainId: 36865,
    inToken: "eth",
    outToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    paymasterToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    baseTokenStakeAmt: 1,
    paymasterTokenStakeAmt: 100,
    prefund: true,
    swapAmount: 1,
    stake: true,
    amount: 1
}
TokenSponsorTest(config)
