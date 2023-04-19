const { FactoryTest } = require('../testUtils/Factory.js')
const { WALLET_PRIVATE_KEY } = require("../../utils")
const config = {
    chainId: 5,
    authPrivateKey: WALLET_PRIVATE_KEY,
}
FactoryTest(config)
