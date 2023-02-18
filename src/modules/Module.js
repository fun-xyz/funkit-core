const { Transaction } = require("../../utils/Transaction")
const ethers = require("ethers")

const EOA_AAVE_WITHDRAWAL_MODULE_NAME = "eoaAaveWithdraw"
const TOKEN_SWAP_MODULE_NAME = "tokenSwap"

class Module {
    wallet = {}

    init() {
    }
    /**
    * Generates and returns an ethers UnsignedTransaction representing a transaction call to the Module's init()
    * method with ethers.constants.HashZero as the input ready to be signed and submitted to a chain.
    * 
    * @returns ethers UnsignedTransaction
    */
    async encodeInitCall() {
        let contract = new ethers.Contract(this.addr, this.abi)
        return contract.populateTransaction.init(ethers.constants.HashZero)
    }

    /**
     * Generates and returns an ethers UnsignedTransaction representing a transaction call to the Module's validate()
     * method with data as the input ready to be signed and submitted to a chain.
     * 
     * @returns ethers UnsignedTransaction
     */

    async encodeValidateCall(data) {
        let contract = new ethers.Contract(this.addr, this.abi)
        return contract.populateTransaction.validate(data)
    }

    /**
     * Generates and returns an ethers UnsignedTransaction representing a transaction call to the Module's execute()
     * method with data as the input ready to be signed and submitted to a chain.
     * 
     * @returns ethers UnsignedTransaction
     */
    async encodeExecuteCall(data) {
        let contract = new ethers.Contract(this.addr, this.abi)
        return contract.populateTransaction.execute(data)
    }

    innerAddData(wallet) {
        Object.keys(wallet).forEach(varKey => {
            this.wallet[varKey] = wallet[varKey]
        })
        this.wallet.prototype = wallet.prototype
    }

    async createUserOpFromCallData({ to, data }, gasLimit = 0, noInit = false, isAction = false) {
        const op = await this.wallet.funWalletDataProvider.createSignedUserOp({ target: to, data, noInit, calldata: isAction, gasLimit })
        return new Transaction({ op }, true)
    }

    verifyRequirements() {
        return true
    }

    async getPreExecTxs() {
        return []
    }
}

module.exports = { Module, EOA_AAVE_WITHDRAWAL_MODULE_NAME, TOKEN_SWAP_MODULE_NAME }