const { BridgeTest } = require('../testUtils/Bridge.js')
const { BRIDGE_PRIVATE_KEY, WALLET_PRIVATE_KEY } = require("../../utils/index.js")

const PREFUND = process.env.PREFUND === 'true' ? true : false
const config = {
  chainId: 137,
  authPrivateKey: WALLET_PRIVATE_KEY,
  bridgePrivateKey: BRIDGE_PRIVATE_KEY,
  outToken: "dai",
  baseToken: "eth",
  prefund: true
}
BridgeTest(config)