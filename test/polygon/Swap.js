const { SwapTest } = require('../testUtils/Swap.js')
const { GOERLI_PRIVATE_KEY } = require("../../utils/index.js")
const WETH_POLYGON = "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270"
const DAI_POLYGON="0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063"
const config = {
    chainId: 137,
    authPrivateKey: GOERLI_PRIVATE_KEY,
    inToken:DAI_POLYGON,
    outToken: WETH_POLYGON,
    prefund: false
}
SwapTest(config.chainId, config.authPrivateKey, config.inToken, config.outToken, config.prefund)