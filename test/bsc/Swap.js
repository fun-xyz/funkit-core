const { SwapTest } = require('../testUtils/Swap.js')
const { WALLET_PRIVATE_KEY, TEST_PRIVATE_KEY } = require("../../utils/index.js")
const DAI_BSC="0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3"
const USDC_BSC="0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d"
const config = {
    chainId: 'bsc',
    authPrivateKey: TEST_PRIVATE_KEY,
    inToken:DAI_BSC,
    outToken: USDC_BSC,
    baseToken: 'eth',
    prefund: true
}
SwapTest(config)