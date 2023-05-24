const { StakeTest } = require('../testUtils/Stake.js')
const { WALLET_PRIVATE_KEY } = require("../../utils/index.js")

const PREFUND = process.env.PREFUND === 'true' ? true : false
const config = {
    chainId: 5,
    authPrivateKey: WALLET_PRIVATE_KEY,
    outToken: "dai",
    baseToken: "eth",
    prefund: PREFUND
}
StakeTest(config)