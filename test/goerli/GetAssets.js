const { WALLET_PRIVATE_KEY } = require("../../utils/index.js")
const { GetAssetsTest } = require('../testUtils/GetAssets.js')

const PREFUND = process.env.PREFUND === 'true' ? true : false
const config = {
    chainId: 5,
    authPrivateKey: WALLET_PRIVATE_KEY,
    inToken:"dai",
    outToken: "weth",
    baseToken: "eth",
    prefund: PREFUND
}
GetAssetsTest(config)