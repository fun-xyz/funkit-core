import { TokenSponsorTest, TokenSponsorTestConfig } from "../testUtils/TokenSponsor"

const config: TokenSponsorTestConfig = {
    chainId: 5,
    inToken: "eth",
    outToken: "dai",
    paymasterToken: "0x712110295e4eCc0F46dC06684AA21263613b08dd",
    baseTokenStakeAmt: 0.6,
    paymasterTokenStakeAmt: 100,
    prefund: false,
    swapAmount: 0.001,
    stake: false,
    mint: false
}
TokenSponsorTest(config)
