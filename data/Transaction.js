class Transaction {
    constructor(data, isUserOp = false) {
        this.data = data
        this.isUserOp = isUserOp
    }
}

module.exports = { Transaction }