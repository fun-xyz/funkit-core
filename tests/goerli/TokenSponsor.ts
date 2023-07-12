import { TokenSponsorTest, TokenSponsorTestConfig } from "../testUtils/TokenSponsor"

const config: TokenSponsorTestConfig = {
    chainId: 5,
    inToken: "eth",
    outToken: "dai",
    paymasterToken: "0x712110295e4eCc0F46dC06684AA21263613b08dd",
    baseTokenStakeAmt: 0.006,
    paymasterTokenStakeAmt: 100,
    prefund: true,
    swapAmount: 0.001,
    stake: true,
    mint: true
}
TokenSponsorTest(config)
