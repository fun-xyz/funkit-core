import { BaseError } from "../BaseError"
import { ErrorBaseType, ErrorType } from "../types"

export class ServerError extends BaseError {
    constructor(type: string, code: string, msg: string, functionName: string, paramsUsed: any, fixSuggestion: string, docLink: string) {
        super(ErrorBaseType.ServerError, type, code, msg, functionName, paramsUsed, fixSuggestion, docLink, true)
    }
}

export class InternalFailureError extends ServerError {
    constructor(code: string, msg: string, functionName: string, paramsUsed: any, fixSuggestion: string, docLink: string) {
        super(ErrorType.InternalServerFailure, code, msg, functionName, paramsUsed, fixSuggestion, docLink)
    }
}
