export type ErrorData = {
    location: string
    error?: {
        txDetails?: ErrorTransactionDetails
        reasonData?: {
            title: string
            reasons: string[]
        }
    }
}

export type ErrorTransactionDetails = {
    method: string
    params: any[]
    contractAddress?: string
    chainId?: number | string
}

export enum ErrorBaseType {
    ClientError = "ClientError",
    ServerError = "ServerError"
}

export enum ErrorType {
    InvalidParameter = "InvalidParameter",
    InternalServerFailure = "InternalServerFailure",
    ResourceNotFound = "ResourceNotFound",
    InvalidAction = "InvalidAction",
    ThrottlingError = "ThrottlingError",
    AccessDeniedError = "AccessDeniedError",
    UserOpFailureError = "UserOpFailureError"
}

export enum ErrorCode {
    MissingParameter = "MissingParameter",
    InvalidParameter = "InvalidParameter",
    InvalidThreshold = "InvalidThreshold",
    InvalidChainIdentifier = "InvalidChainIdentifier",
    InvalidNFTIdentifier = "InvalidNFTIdentifier",
    InsufficientSignatures = "InsufficientSignatures",
    InvalidParameterCombination = "InvalidParameterCombination",
    CheckPointHintsNotFound = "CheckPointHintsNotFound",
    GroupNotFound = "GroupNotFound",
    TokenNotFound = "TokenNotFound",
    AddressNotFound = "AddressNotFound",
    UserAlreadyExists = "UserAlreadyExists",
    UserNotFound = "UserNotFound",
    ChainNotSupported = "ChainNotSupported",
    ServerMissingData = "ServerMissingData",
    ServerFailure = "ServerFailure",
    ServerTimeout = "ServerTimeout",
    UnknownServerError = "UnknownServerError",
    ServerConnectionError = "ServerConnectionError",
    UserOpFailureError = "UserOpFailureError",
    Unauthorized = "Unauthorized",
    RequestLimitExceeded = "RequestLimitExceeded",
    WalletPrefundError = "PrefundError",
    GasSponsorFundError = "GasSponsorFundError",
    FunWalletErrorCode = "FunWalletErrorCode",
    BridgeRouteNotFound = "BridgeRouteNotFound",
    BridgeAllowanceDataNotFound = "BridgeAllowanceDataNotFound",
    BridgeApproveTxDataNotFound = "BridgeApproveTxDataNotFound",
    ChainNotInitialized = "ChainNotInitialized",
    AuthNotInitialized = "AuthNotInitialized",
    FunWalletAddressNotInitialized = "FunWalletAddressNotInitialized",
    InvalidAction = "InvalidAction"
}
