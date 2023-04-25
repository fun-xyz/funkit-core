const { SwapTest } = require('../testUtils/Swap.js')
const { WALLET_PRIVATE_KEY } = require("../../utils/index.js")
const config = {
    chainId: 5,
    authPrivateKey: WALLET_PRIVATE_KEY,
    inToken:"dai",
    outToken: "usdc",
    baseToken: "eth",
    prefund: false
}
SwapTest(config)