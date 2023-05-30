const { BaseError } = require("./BaseError")

class ServerError extends BaseError {
    constructor(errorType, location, helper = "", isInternal = false) {
        super(`${errorType} in ${location}`, helper, isInternal)
    }
}

class ServerMissingDataError extends ServerError {
    constructor(location, serverType, helper, isInternal = false) {
        super(`Data not found during ${serverType} call`, location, helper, isInternal)
    }
}

class NoServerConnectionError extends ServerError {
    constructor(location, serverType, helper, isInternal = false) {
        super(`Server not found during ${serverType} call`, location, helper, isInternal)
    }
}

module.exports = { ServerError, ServerMissingDataError, NoServerConnectionError }
