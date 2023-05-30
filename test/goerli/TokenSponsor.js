const { TokenSponsorTest } = require('../testUtils/TokenSponsor.js')
const { WALLET_PRIVATE_KEY, WALLET_PRIVATE_KEY_2 } = require("../../utils/index.js")

const PREFUND = process.env.PREFUND === 'true' ? true : false
const config = {
    chainId: 5,
    authPrivateKey: WALLET_PRIVATE_KEY_2,
    funderPrivateKey: WALLET_PRIVATE_KEY,
    inToken: "eth",
    outToken: "dai",
    paymasterToken: "0x07865c6E87B9F70255377e024ace6630C1Eaa37F",
    baseTokenStakeAmt: .61,
    paymasterTokenStakeAmt: 100,
    prefund: PREFUND,
    swapAmount: .01,
    stake: false,
}
TokenSponsorTest(config)