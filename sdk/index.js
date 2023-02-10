const { FunWallet } = require("./src/FunWallet")
const { AccessControlSchema } = require("./src/schema")
const configs = require("./utils/configs/walletConfigs")
const wallets = require("./src/wallets/index.js")

module.exports = {
    FunWallet,
    AccessControlSchema,
    wallets,
    configs
}