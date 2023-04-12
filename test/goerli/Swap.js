const { SwapTest } = require('../testUtils/Swap.js')
const { GOERLI_PRIVATE_KEY } = require("../../utils/index.js")
const config = {
    chainId: 5,
    authPrivateKey: GOERLI_PRIVATE_KEY,
    outToken: "weth",
    prefund: false
}
SwapTest(config.chainId, config.authPrivateKey, config.outToken, config.prefund)