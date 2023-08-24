import { BaseError } from "./BaseError"
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
        if (msg.includes("AA21")) {
            const { reqId } = JSON.parse(msg)
            msg = ErrorCode.WalletPrefundError + ": Your wallet lacks funds for this transaction."
            fixSuggestion = `Wallet Address: ${paramsUsed.body.userOp.sender}`
            super(ErrorType.UserOpFailureError, ErrorCode.WalletPrefundError, msg, { reqId }, fixSuggestion, docLink)
        } else if (msg.includes("AA33 reverted: FW332")) {
            const { reqId } = JSON.parse(msg)
            msg =
                ErrorCode.GasSponsorFundError +
                ": " +
                (paramsUsed.body.userOp.paymasterAndData.length > 122
                    ? "Your wallet does not have enough erc-20 tokens to pay for gas."
                    : "Your FunWallet has not approved enough ERC-20s for the paymaster smart contract to pay for gas. Use the approve function in the TokenSponsor class.")
            fixSuggestion = `Wallet Address: ${paramsUsed.body.userOp.sender}`
            super(ErrorType.UserOpFailureError, ErrorCode.GasSponsorFundError, msg, { reqId }, fixSuggestion, docLink)
        } else {
            super(ErrorType.UserOpFailureError, code, msg, paramsUsed, fixSuggestion, docLink)
        }
    }
}
