import { TokenSponsorTest, TokenSponsorTestConfig } from "../testUtils/TokenSponsor"

const config: TokenSponsorTestConfig = {
    chainId: 5,
    inToken: "usdc",
    outToken: "dai",
    paymasterToken: "0x0a1F0598A561af6b84A726bE007f581E812C3CDD",
    baseTokenStakeAmt: 0.2,
    paymasterTokenStakeAmt: 100,
    prefund: true,
    swapAmount: 0.001,
    stake: true,
    mint: false
}
TokenSponsorTest(config)
