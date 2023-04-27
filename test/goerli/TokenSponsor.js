const { TokenSponsorTest } = require('../testUtils/TokenSponsor.js')
const { WALLET_PRIVATE_KEY, WALLET_PRIVATE_KEY_2 } = require("../../utils/index.js")
const config = {
    chainId: 5,
    authPrivateKey: WALLET_PRIVATE_KEY_2,
    funderPrivateKey: WALLET_PRIVATE_KEY,
    inToken: "eth",
    outToken: "dai",
    paymasterToken: "usdc",
    baseTokenStakeAmt: 1,
    paymasterTokenStakeAmt: 100,
    prefund: false,
    swapAmount: .01,
    stake:true,
}
TokenSponsorTest(config)