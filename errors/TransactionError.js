const { BaseError } = require("./BaseError");


class TransactionError extends BaseError {
    constructor(location = "", helper = "", isInternal = false, stackDepth = 1) {
        super(`Transaction failed at ${location}`, helper, isInternal, stackDepth);
    }
}

module.exports = { TransactionError };