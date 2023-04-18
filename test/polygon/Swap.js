const { SwapTest } = require('../testUtils/Swap.js')
const { GOERLI_PRIVATE_KEY } = require("../../utils/index.js")
const WETH_POLYGON = "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270"
const DAI_POLYGON="0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063"
const USDC_POLYGON="0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174"
const config = {
    chainId: 'polygon',
    authPrivateKey: GOERLI_PRIVATE_KEY,
    inToken:DAI_POLYGON,
    outToken: USDC_POLYGON,
    baseToken: 'matic',
    prefund: true
}
SwapTest(config.chainId, config.authPrivateKey, config.inToken, config.outToken, config.baseToken, config.prefund)