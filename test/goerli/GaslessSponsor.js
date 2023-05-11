const { GaslessSponsorTest } = require('../testUtils/GaslessSponsor.js')
const { WALLET_PRIVATE_KEY, WALLET_PRIVATE_KEY_2 } = require("../../utils/index.js")

const PREFUND = process.env.PREFUND === 'true' ? true : false
const config = {
    chainId: 5,
    authPrivateKey: WALLET_PRIVATE_KEY,
    funderPrivateKey: WALLET_PRIVATE_KEY_2,
    inToken: "eth",
    outToken: "usdc",
    stakeAmount: 1,
    prefund: true
}
GaslessSponsorTest(config)