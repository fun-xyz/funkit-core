class Transaction {
    constructor(data, isUserOp) {
        this.data = data
        this.isUserOp = isUserOp
    }
}

module.exports = { Transaction }