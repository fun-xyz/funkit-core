const { TokenSponsorTest } = require('../testUtils/TokenSponsor.js')
const { WALLET_PRIVATE_KEY, CHAIN_FUNDER_PRIVATE_KEY } = require("../../utils/index.js")
const config = {
    chainId: 5,
    authPrivateKey: CHAIN_FUNDER_PRIVATE_KEY,
    funderPrivateKey: WALLET_PRIVATE_KEY,
    inToken: "eth",
    outToken: "dai",
    paymasterToken: "usdc",
    baseTokenStakeAmt: 1,
    paymasterTokenStakeAmt: 100,
    prefund: false,
    swapAmount: .01
}
TokenSponsorTest(config)