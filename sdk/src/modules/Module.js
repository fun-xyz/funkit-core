const ethers = require("ethers")
const { Transaction } = require("../../utils/Transaction")
const ModuleObj = require("../../utils/abis/Module.json")
class Module {
    wallet = {}
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

    create() {
        return this.encodeInitCall()
    }

    addActionContract() {
        if (!this.actionContract) {
            this.actionContract = new ethers.Contract(this.actionAddr, ModuleObj.abi)
        }
    }
    async encodeExecuteCall(data) {
        this.addActionContract()
        return await this.actionContract.populateTransaction.execute(data)
    }

    async encodeInitCall() {
        this.addActionContract()
        return await this.actionContract.populateTransaction.init(ethers.constants.HashZero)
    }

    async createUserOpFromCallData({ to, data }, isAction = false) {
        const op = await this.wallet.accountApi.createSignedUserOp({ target: to, data, calldata: isAction })
        return new Transaction({ op }, true)
    }
}

module.exports = { Module }