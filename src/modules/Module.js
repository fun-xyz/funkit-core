const ModuleObj = require("../../utils/abis/Module.json")
const { Transaction } = require("../../utils/Transaction")
const ethers = require("ethers")

class Module {
    wallet = {}

    init(addr) {
        this.addr = addr
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

    async createUserOpFromCallData({ to, data }, isAction = false) {
        const op = await this.wallet.funWalletDataProvider.createSignedUserOp({ target: to, data, calldata: isAction })
        this.wallet.dataServer.storeUserOp({ op, type: "create_transaction"})
        return new Transaction({ op }, true)
    }

    verifyRequirements() {
        return true
    }
}

module.exports = { Module }