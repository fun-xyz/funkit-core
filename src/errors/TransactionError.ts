import { BaseError } from "./BaseError"
import { Helper } from "./Helper"

export class TransactionError extends BaseError {
    constructor(location = "", helper: Helper, isInternal = false, stackDepth = 1) {
        super(`Transaction failed at ${location}`, helper, isInternal, stackDepth)
    }
}
