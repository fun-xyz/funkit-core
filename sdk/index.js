const { FunWallet } = require("./src/FunWallet")
const { TransferToken } = require('./src/modules/TransferToken')
const { EOAAAVEWithdrawal } = require("./src/modules/EOAaveWithdrawal")
const { AccessControlSchema } = require("./src/schema")
const wallets = require("./src/wallets/index.js")

module.exports = {
    FunWallet,
    EOAAAVEWithdrawal,
    AccessControlSchema,
    TransferToken,
    wallets
}