const { GaslessSponsorTest } = require('../testUtils/GaslessSponsor.js')
const { WALLET_PRIVATE_KEY, WALLET_PRIVATE_KEY_2 } = require("../../utils/index.js")
const config = {
    chainId: 137,
    authPrivateKey: WALLET_PRIVATE_KEY,
    funderPrivateKey: WALLET_PRIVATE_KEY_2,
    inToken: "matic",
    outToken: "usdc",
    stakeAmount: 1,
    prefund: false
}

GaslessSponsorTest(config)