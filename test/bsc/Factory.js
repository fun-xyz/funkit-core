const { FactoryTest } = require('../testUtils/Factory.js')
const { WALLET_PRIVATE_KEY, TEST_PRIVATE_KEY } = require("../../utils")
const config = {
    chainId: 56,
    authPrivateKey: TEST_PRIVATE_KEY,
}
FactoryTest(config)
