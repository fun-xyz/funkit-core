import { BaseError } from "./BaseError"
import { DataFormatError } from "./DataError"
import { Helper } from "./Helper"

export class ParameterError extends BaseError {
    constructor(errorType: string, location: string, helper: Helper, isInternal = false) {
        super(`${errorType} required parameters at ${location}`, helper, isInternal)
    }
}

export class MissingParameterError extends ParameterError {
    constructor(location: string, helper?: Helper, isInternal = false) {
        helper = helper ? helper : new Helper("", "", "")
        super("Missing", location, helper, isInternal)
    }
}

export class ParameterFormatError extends DataFormatError {
    constructor(location: string, helper: Helper, isInternal = false) {
        super(location, "parameter", "", helper, isInternal)
    }
}
