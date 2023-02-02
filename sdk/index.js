const { FunWallet } = require("./src/FunWallet")
const { AAVEWithdrawal } = require("./src/modules/AAVEWithdrawal")
const { AccessControlSchema } = require("./src/schema")
const wallets = require("./src/wallets/index.js")

module.exports = {
    FunWallet,
    AAVEWithdrawal,
    AccessControlSchema,
    wallets
}