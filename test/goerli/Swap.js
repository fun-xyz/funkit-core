const { SwapTest } = require('../testUtils/Swap.js')
const { GOERLI_PRIVATE_KEY } = require("../../utils/index.js")
const config = {
    chainId: 5,
    authPrivateKey: GOERLI_PRIVATE_KEY,
    inToken:"dai",
    outToken: "weth",
    baseToken: "eth",
    prefund: false
}
SwapTest(config)