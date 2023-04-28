const { TokenSponsorTest } = require('../testUtils/TokenSponsor.js')
const { WALLET_PRIVATE_KEY, WALLET_PRIVATE_KEY_2 } = require("../../utils/index.js")
const config = {
    chainId: 137,
    authPrivateKey: WALLET_PRIVATE_KEY_2,
    funderPrivateKey: WALLET_PRIVATE_KEY,
    inToken: "matic",
    outToken: "dai",
    paymasterToken: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
    baseTokenStakeAmt: 1,
    paymasterTokenStakeAmt: 1,
    prefund: false,
    swapAmount: .01,
    stake: true,
}
TokenSponsorTest(config)