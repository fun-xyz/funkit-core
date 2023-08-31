import { BaseError } from "./BaseError"
import FWErrors from "./errors.json"
import { ErrorBaseType, ErrorCode, ErrorType } from "./types"
export class ClientError extends BaseError {
    constructor(type: string, code: string, msg: string, paramsUsed: any, fixSuggestion: string, docLink: string) {
        super(ErrorBaseType.ClientError, type, code, msg, paramsUsed, fixSuggestion, docLink, false)
    }
}

export class InvalidParameterError extends ClientError {
    constructor(code: string, msg: string, paramsUsed: any, fixSuggestion: string, docLink: string) {
        super(ErrorType.InvalidParameter, code, msg, paramsUsed, fixSuggestion, docLink)
    }
}

export class ResourceNotFoundError extends ClientError {
    constructor(code: string, msg: string, paramsUsed: any, fixSuggestion: string, docLink: string) {
        if (msg.includes("Chain name not found")) {
            const { reqId } = JSON.parse(msg)
            msg = ": Chain name not found or not supported."
            fixSuggestion = "Change your EnvOptions to the correct chain identifier."
            super(ErrorType.ResourceNotFound, ErrorCode.ChainNotSupported, msg, { reqId }, fixSuggestion, docLink)
        } else {
            super(ErrorType.ResourceNotFound, code, msg, paramsUsed, fixSuggestion, docLink)
        }
    }
}

export class InvalidActionError extends ClientError {
    constructor(code: string, msg: string, paramsUsed: any, fixSuggestion: string, docLink: string) {
        super(ErrorType.InvalidAction, code, msg, paramsUsed, fixSuggestion, docLink)
    }
}

export class ThrottlingError extends ClientError {
    constructor(code: string, msg: string, paramsUsed: any, fixSuggestion: string, docLink: string) {
        super(ErrorType.ThrottlingError, code, msg, paramsUsed, fixSuggestion, docLink)
    }
}

export class AccessDeniedError extends ClientError {
    constructor(code: string, msg: string, paramsUsed: any, fixSuggestion: string, docLink: string) {
        super(ErrorType.AccessDeniedError, code, msg, paramsUsed, fixSuggestion, docLink)
    }
}

export class UserOpFailureError extends ClientError {
    constructor(code: string, msg: string, paramsUsed: any, fixSuggestion: string, docLink: string) {
        const FWCode = findFWContractError(msg)
        if (FWCode) {
            const { reqId } = JSON.parse(msg)
            msg = FWErrors[FWCode].info
            fixSuggestion = FWErrors[FWCode].suggestion
            super(ErrorType.UserOpFailureError, ErrorCode.FunWalletErrorCode, msg, { reqId }, fixSuggestion, docLink)
        } else {
            super(ErrorType.UserOpFailureError, code, msg, paramsUsed, fixSuggestion, docLink)
        }
    }
}

const findFWContractError = (msg: string) => {
    const match = msg.match(/FW\d{3}/)
    return match?.[0]
}
