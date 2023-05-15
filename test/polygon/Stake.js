const { StakeTest } = require('../testUtils/Stake.js')
const { WALLET_PRIVATE_KEY } = require("../../utils/index.js")

const PREFUND = process.env.PREFUND === 'true' ? true : false
const config = {
    chainId: 'polygon',
    authPrivateKey: WALLET_PRIVATE_KEY,
    baseToken: 'matic',
    prefund: PREFUND
}
StakeTest(config)