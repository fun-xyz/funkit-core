const { FunWallet } = require("./src/FunWallet")
const { FunWalletConfig } = require("./src/FunWalletConfig")
const { EoaAaveWithdrawal, TokenSwap, TokenTransfer } = require("./src/modules/index")
const Modules = { EoaAaveWithdrawal, TokenSwap, TokenTransfer }

module.exports = {
    FunWallet,
    FunWalletConfig,
    Modules
}