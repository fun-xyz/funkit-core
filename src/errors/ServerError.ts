import { BaseError } from "./BaseError"
import { Helper } from "./Helper"

export class ServerError extends BaseError {
    constructor(errorType, location: string, helper: Helper, isInternal = false) {
        super(`${errorType} in ${location}`, helper, isInternal)
    }
}

export class ServerMissingDataError extends ServerError {
    constructor(location: string, serverType: string, helper: Helper, isInternal = false) {
        super(`Data not found during ${serverType} call`, location, helper, isInternal)
    }
}

export class NoServerConnectionError extends ServerError {
    constructor(location: string, serverType: string, helper: Helper, isInternal = false) {
        super(`Server not found during ${serverType} call`, location, helper, isInternal)
    }
}
