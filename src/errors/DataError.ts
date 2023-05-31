import { BaseError } from "./BaseError"
import { Helper } from "./Helper"

export class DataFormatError extends BaseError {
    constructor(dataName: string, dataType: string, location = "", helper?: Helper, isInternal = false, stackDepth = 1) {
        helper = helper ? helper : new Helper("", null, "")
        super(`${dataName} has incorrect ${dataType} format${location ? ` in ${location}` : ""}`, helper, isInternal, stackDepth)
    }
}
