const { FunWallet } = require("./src/FunWallet")
const { FunWalletConfig } = require("./src/FunWalletConfig")
const { AaveWithdrawal, TokenSwap, TokenTransfer } = require("./src/modules/index")
const Modules = { AaveWithdrawal, TokenSwap, TokenTransfer }

module.exports = {
    FunWallet,
    FunWalletConfig,
    Modules
}