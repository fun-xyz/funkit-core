const { BaseError } = require("./BaseError")

class DataFormatError extends BaseError {
    constructor(dataName, dataType, location = "", helper = "", isInternal = false, stackDepth = 1) {
        super(`${dataName} has incorrect ${dataType} format${location ? ` in ${location}` : ""}`, helper, isInternal, stackDepth)
    }
}

module.exports = { DataFormatError }
