const { TransferTest } = require('../testUtils/Transfer.js')
const { WALLET_PRIVATE_KEY_2 } = require("../../utils/index.js")
const DAI_POLYGON = "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063"
const config = {
    chainId: 137,
    authPrivateKey: WALLET_PRIVATE_KEY_2,
    outToken: DAI_POLYGON,
    baseToken: 'matic',
    prefund: true
}
TransferTest(config)