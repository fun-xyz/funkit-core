const { TransferTest } = require('../testUtils/Transfer.js')
const { GOERLI_PRIVATE_KEY } = require("../../utils/index.js")
const DAI_POLYGON="0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063"
const config = {
    chainId: 137,
    authPrivateKey: GOERLI_PRIVATE_KEY,
    outToken: DAI_POLYGON,
    baseToken: 'matic',
    prefund: false
}
TransferTest(config.chainId, config.authPrivateKey, config.outToken, config.baseToken, config.prefund)