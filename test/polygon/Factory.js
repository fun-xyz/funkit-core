const { FactoryTest } = require('../testUtils/Factory.js')
const { TEST_PRIVATE_KEY, GOERLI_PRIVATE_KEY } = require("../../utils")
const config = {
    chainId: 5,
    authPrivateKey: TEST_PRIVATE_KEY,
    funderPrivateKey: GOERLI_PRIVATE_KEY
}
FactoryTest(config.chainId, config.authPrivateKey, config.funderPrivateKey)
