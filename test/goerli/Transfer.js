const { TransferTest } = require('../testUtils/Transfer.js')
const { GOERLI_PRIVATE_KEY } = require("../../utils/index.js")
const config = {
    chainId: 5,
    authPrivateKey: GOERLI_PRIVATE_KEY,
    outToken: "dai",
    baseToken: "eth",
    prefund: false
}
TransferTest(config.chainId, config.authPrivateKey, config.outToken, config.baseToken, config.prefund)