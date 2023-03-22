const { BaseError } = require("./BaseError");
const { DataFormatError } = require("./DataFormatError");

class ParameterError extends BaseError {
    constructor(errorType, location, helper = "", isInternal = false) {
        super(`${errorType} required parameters at ${location}`, helper, isInternal);
    }
}

class MissingParameterError extends ParameterError {
    constructor(location, helper = "", isInternal = false) {
        super("Missing", location, helper, isInternal);
    }
}

class ParameterFormatError extends DataFormatError {
    constructor(location, helper = "", isInternal = false) {
        super(location, "parameter", "", helper, isInternal);
    }
}

module.exports = { MissingParameterError, ParameterError, ParameterFormatError };
