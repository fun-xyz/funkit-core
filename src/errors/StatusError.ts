import { BaseError } from "./BaseError"

export class StatusError extends BaseError {
    constructor(service: string, status: string, location = "", helper, isInternal = false, stackDepth = 1) {
        super(`${service} ${status} in ${location}`, helper, isInternal, stackDepth)
    }
}
