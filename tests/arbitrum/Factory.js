const { FactoryTest } = require("../testUtils/Factory.js")
const { WALLET_PRIVATE_KEY } = require("../../utils")
const config = {
    chainId: 42161,
    authPrivateKey: WALLET_PRIVATE_KEY,
    testCreate: false,
    prefundAmt: 0.012
}
FactoryTest(config)
