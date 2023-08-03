import { BaseError } from "../BaseError"
import { ErrorBaseType, ErrorType } from "../types"

export class ClientError extends BaseError {
    constructor(type: string, code: string, msg: string, functionName: string, paramsUsed: any, fixSuggestion: string, docLink: string) {
        super(ErrorBaseType.ClientError, type, code, msg, functionName, paramsUsed, fixSuggestion, docLink, false)
    }
}

export class InvalidParameterError extends ClientError {
    constructor(code: string, msg: string, functionName: string, paramsUsed: any, fixSuggestion: string, docLink: string) {
        super(ErrorType.InvalidParameter, code, msg, functionName, paramsUsed, fixSuggestion, docLink)
    }
}

export class ResourceNotFoundError extends ClientError {
    constructor(code: string, msg: string, functionName: string, paramsUsed: any, fixSuggestion: string, docLink: string) {
        super(ErrorType.ResourceNotFound, code, msg, functionName, paramsUsed, fixSuggestion, docLink)
    }
}

export class InvalidActionError extends ClientError {
    constructor(code: string, msg: string, functionName: string, paramsUsed: any, fixSuggestion: string, docLink: string) {
        super(ErrorType.InvalidAction, code, msg, functionName, paramsUsed, fixSuggestion, docLink)
    }
}

export class ThrottlingError extends ClientError {
    constructor(code: string, msg: string, functionName: string, paramsUsed: any, fixSuggestion: string, docLink: string) {
        super(ErrorType.ThrottlingError, code, msg, functionName, paramsUsed, fixSuggestion, docLink)
    }
}

export class AccessDeniedError extends ClientError {
    constructor(code: string, msg: string, functionName: string, paramsUsed: any, fixSuggestion: string, docLink: string) {
        super(ErrorType.AccessDeniedError, code, msg, functionName, paramsUsed, fixSuggestion, docLink)
    }
}

export class UserOpFailureError extends ClientError {
    constructor(code: string, msg: string, functionName: string, paramsUsed: any, fixSuggestion: string, docLink: string) {
        super(ErrorType.UserOpFailureError, code, msg, functionName, paramsUsed, fixSuggestion, docLink)
    }
}
