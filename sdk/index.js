const { FunWallet } = require("./src/FunWallet")
const { AAVEWithdrawal } = require("./src/modules/AAVEWithdrawal")
const { TransferToken } = require('./src/modules/TransferToken')
const { AccessControlSchema } = require("./src/schema")
const wallets = require("./src/wallets/index.js")

module.exports = {
    FunWallet,
    AAVEWithdrawal,
    AccessControlSchema,
    TransferToken, 
    wallets
}