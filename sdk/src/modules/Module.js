const ModuleObj = require("../../utils/abis/Module.json")
const Transaction = require("../../utils/Transaction")
const ethers = require("ethers")


class Module {

    wallet = {}

    contract = new ethers.Contract(this.addr, ModuleObj.abi)

     /**
     * Generates and returns an ethers UnsignedTransaction representing a transaction call to the Module's init()
     * method with ethers.constants.HashZero as the input ready to be signed and submitted to a chain.
     * 
     * @returns ethers UnsignedTransaction
     */
    async encodeInitCall() {
        return this.contract.populateTransaction.init(ethers.constants.HashZero)
    }

    /**
     * Generates and returns an ethers UnsignedTransaction representing a transaction call to the Module's execute()
     * method with data as the input ready to be signed and submitted to a chain.
     * 
     * @returns ethers UnsignedTransaction
     */
    async encodeExecuteCall(data) {
        return this.contract.populateTransaction.execute(data)
    }

    /**
     * Generates and returns an ethers UnsignedTransaction representing a transaction call to the Module's validate()
     * method with data as the input ready to be signed and submitted to a chain.
     * 
     * @returns ethers UnsignedTransaction
     */
    async encodeValidateCall(data) {
        return this.contract.populateTransaction.validate(data)
    }

    async createUserOpFromCallData({ to, data }, isAction = false) {
        const op = await this.wallet.accountApi.createSignedUserOp({ target: to, data, calldata: isAction })
        return new Transaction({ op }, true)
    }

    getRequiredPreTxs() {
        return []
    }

    verifyRequirements() {
        return true
    }

    innerAddData(wallet) {
        Object.keys(wallet).forEach(varKey => {
            this.wallet[varKey] = wallet[varKey]
        })
        this.wallet.prototype = wallet.prototype
    }
}

module.exports = { Module }