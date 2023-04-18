const { FactoryTest } = require('../testUtils/Factory.js')
const { GOERLI_PRIVATE_KEY } = require("../../utils")
const config = {
    chainId: 5,
    authPrivateKey: GOERLI_PRIVATE_KEY,
}
FactoryTest(config)
