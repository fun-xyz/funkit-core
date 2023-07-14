import { TokenSponsorTest, TokenSponsorTestConfig } from "../testUtils/TokenSponsor"

const config: TokenSponsorTestConfig = {
    chainId: 5,
    inToken: "eth",
    outToken: "dai",
    paymasterToken: "0x3E1FF16B9A94eBdE6968206706BcD473aA3Da767",
    baseTokenStakeAmt: 0.006,
    paymasterTokenStakeAmt: 100,
    prefund: false,
    swapAmount: 0.001,
    stake: true
}
TokenSponsorTest(config)
