const { GaslessSponsorTest } = require('../testUtils/GaslessSponsor.js')
const { WALLET_PRIVATE_KEY, WALLET_PRIVATE_KEY_2 } = require("../../utils/index.js")

const PREFUND = process.env.PREFUND === 'true' ? true : false
const config = {
    chainId: 42161,
    authPrivateKey: WALLET_PRIVATE_KEY,
    funderPrivateKey: WALLET_PRIVATE_KEY_2,
    inToken: "eth",
    outToken: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",
    stakeAmount: 0.01,
    prefund: PREFUND,
    amount:.00001,
    walletIndex:0,
    funderIndex:1
}
GaslessSponsorTest(config)