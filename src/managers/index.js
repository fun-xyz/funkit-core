const WalletOnChainManager = require("./WalletOnChainManager")
const WalletAbiManager = require("./WalletAbiManager")

module.exports = {
    ...WalletOnChainManager,
    ...WalletAbiManager
}
