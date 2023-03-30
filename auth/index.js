const Auth = require("./Auth")
const EoaAuth = require("./EoaAuth")
const WalletConnectAuth = require("./WalletConnectEoa")

module.exports = { ...Auth, ...EoaAuth, ...WalletConnectAuth };