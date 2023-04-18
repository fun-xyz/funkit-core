const { TransferTest } = require('../testUtils/Transfer.js')
const { WALLET_PRIVATE_KEY } = require("../../utils/index.js")
const config = {
    chainId: 5,
    authPrivateKey: WALLET_PRIVATE_KEY,
    outToken: "dai",
    baseToken: "eth",
    prefund: false
}
TransferTest(config)