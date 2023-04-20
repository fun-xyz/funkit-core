const { TransferTest } = require('../testUtils/Transfer.js')
const { WALLET_PRIVATE_KEY,TEST_PRIVATE_KEY } = require("../../utils/index.js")
const DAI_BSC="0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3"
const config = {
    chainId: 56,
    authPrivateKey: TEST_PRIVATE_KEY,
    outToken: DAI_BSC,
    baseToken: 'eth',
    prefund: true
}
TransferTest(config)