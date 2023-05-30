const { FactoryTest } = require("../testUtils/Factory.js")
const { WALLET_PRIVATE_KEY } = require("../../utils")
const config = {
    chainId: 137,
    authPrivateKey: WALLET_PRIVATE_KEY
}
FactoryTest(config)
