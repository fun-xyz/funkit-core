const { SwapTest } = require('../testUtils/Swap.js')
const { GOERLI_PRIVATE_KEY } = require("../../utils/index.js")
const config = {
    chainId: 5,
    authPrivateKey: GOERLI_PRIVATE_KEY,
    inToken:"dai",
    outToken: "weth",
    prefund: true
}
SwapTest(config.chainId, config.authPrivateKey, config.inToken, config.outToken, config.prefund)