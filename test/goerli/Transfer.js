const { TransferTest } = require('../testUtils/Transfer.js')
const { WALLET_PRIVATE_KEY } = require("../../utils/index.js")

const PREFUND = process.env.PREFUND === 'true' ? true : false
const config = {
    chainId: 5,
    authPrivateKey: WALLET_PRIVATE_KEY,
    outToken: "dai",
    baseToken: "eth",
    prefund: PREFUND
}
TransferTest(config)