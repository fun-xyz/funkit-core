import { TokenSponsorTest, TokenSponsorTestConfig } from "../testUtils/TokenSponsor"

const config: TokenSponsorTestConfig = {
    chainId: 137,
    inToken: "matic",
    outToken: "dai",
    paymasterToken: "0x88A940be4EcC9470400Ad76D30479594E15B1637",
    baseTokenStakeAmt: 0,
    prefundAmt: 1,
    paymasterTokenStakeAmt: 10,
    prefund: false,
    swapAmount: 0.001,
    stake: false,
    mint: false
}
TokenSponsorTest(config)
