const { GaslessSponsorTest } = require('../testUtils/GaslessSponsor.js')
const { WALLET_PRIVATE_KEY, CHAIN_FUNDER_PRIVATE_KEY } = require("../../utils/index.js")
const config = {
    chainId: 5,
    authPrivateKey: WALLET_PRIVATE_KEY,
    funderPrivateKey: CHAIN_FUNDER_PRIVATE_KEY,
    inToken: "eth",
    outToken: "usdc",
    stakeAmount: 1,
    prefund: false
}
GaslessSponsorTest(config)