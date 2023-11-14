import { Address, Hex, isAddress, parseEther } from "viem"
import { ApproveERC20Params, ApproveERC721Params, ApproveParams, ERC721TransferParams, TokenTransferParams, TransferParams } from "./types"
import { ERC20_CONTRACT_INTERFACE, ERC721_CONTRACT_INTERFACE, TransactionParams } from "../common"
import { Token } from "../data"
import { ErrorCode, InvalidParameterError } from "../errors"
export const isERC721TransferParams = (obj: TransferParams): obj is ERC721TransferParams => {
    return "tokenId" in obj
}

export const isTokenTransferParams = (obj: TransferParams): obj is TokenTransferParams => {
    return "amount" in obj && "token" in obj && "to" in obj
}

export const erc721TransferTransactionParams = async (params: ERC721TransferParams): Promise<TransactionParams> => {
    const { to, tokenId, collection, from } = params
    if (!isAddress(to ?? "") || !isAddress(from ?? "")) {
        throw new InvalidParameterError(
            ErrorCode.InvalidParameter,
            "To/from address is not a valid address, please make sure it is a valid checksum address.",
            { params },
            "Please make sure it is a valid checksum address",
            "https://docs.fun.xyz"
        )
    }
    const tokenAddr = collection
    if (!isAddress(tokenAddr)) {
        throw new InvalidParameterError(
            ErrorCode.InvalidParameter,
            "Collection is not a valid address, please make sure it is a valid checksum address.",
            { params },
            "Please make sure it is a valid checksum address",
            "https://docs.fun.xyz"
        )
    }

    return ERC721_CONTRACT_INTERFACE.encodeTransactionParams(tokenAddr, "transferFrom", [from, to, tokenId])
}

export const tokenTransferTransactionParams = async (params: TokenTransferParams): Promise<TransactionParams> => {
    const { to, amount, token } = params
    if (!isAddress(to)) {
        throw new InvalidParameterError(
            ErrorCode.InvalidParameter,
            "To address is not a valid address, please make sure it is a valid checksum address.",
            { params },
            "Please make sure it is a valid checksum address",
            "https://docs.fun.xyz"
        )
    }
    if (!(token instanceof Token)) {
        throw new InvalidParameterError(
            ErrorCode.InvalidParameter,
            "Token is not a valid Token object.",
            { params },
            "Please make sure it is a valid Token object",
            "https://docs.fun.xyz"
        )
    }
    if (token.isNative) {
        return { to: to as Address, data: "0x" as Hex, value: parseEther(`${amount}`) }
    } else {
        const tokenAddr = await token.getAddress()
        if (!tokenAddr) {
            throw new InvalidParameterError(
                ErrorCode.TokenNotFound,
                "Token address not found. Please check the token passed in.",
                { params },
                "Provide correct token.",
                "https://docs.fun.xyz"
            )
        }
        const convertedAmount = await token.getDecimalAmount(amount)
        return ERC20_CONTRACT_INTERFACE.encodeTransactionParams(tokenAddr, "transfer", [to, convertedAmount])
    }
}

export const tokenTransferFromTransactionParams = async (params: TokenTransferParams): Promise<TransactionParams> => {
    const { to, amount, token, from } = params
    if (!isAddress(to ?? "") || !isAddress(from ?? "")) {
        throw new InvalidParameterError(
            ErrorCode.InvalidParameter,
            "To/from address is not a valid address, please make sure it is a valid checksum address.",
            { params },
            "Please make sure it is a valid checksum address",
            "https://docs.fun.xyz"
        )
    }
    if (!(token instanceof Token)) {
        throw new InvalidParameterError(
            ErrorCode.InvalidParameter,
            "Token is not a valid Token object.",
            { params },
            "Please make sure it is a valid Token object",
            "https://docs.fun.xyz"
        )
    }
    if (token.isNative) {
        return { to: to as Address, data: "0x" as Hex, value: parseEther(`${amount}`) }
    } else {
        const tokenAddr = await token.getAddress()
        if (!tokenAddr) {
            throw new InvalidParameterError(
                ErrorCode.TokenNotFound,
                "Token address not found. Please check the token passed in.",
                { params },
                "Provide correct token.",
                "https://docs.fun.xyz"
            )
        }
        const convertedAmount = await token.getDecimalAmount(amount)
        return ERC20_CONTRACT_INTERFACE.encodeTransactionParams(tokenAddr, "transferFrom", [from, to, convertedAmount])
    }
}

export const isERC20ApproveParams = (obj: ApproveParams): obj is ApproveERC20Params => {
    return "amount" in obj && "token" in obj
}

export const isERC721ApproveParams = (obj: ApproveParams): obj is ApproveERC721Params => {
    return "tokenId" in obj && "collection" in obj
}

export const erc20ApproveTransactionParams = async (params: ApproveERC20Params): Promise<TransactionParams> => {
    const { spender, amount, token } = params
    if (!isAddress(spender ?? "")) {
        throw new InvalidParameterError(
            ErrorCode.InvalidParameter,
            "Spender address is not a valid address, please make sure it is a valid checksum address.",
            { params },
            "Please make sure it is a valid checksum address",
            "https://docs.fun.xyz"
        )
    }

    if (!(token instanceof Token)) {
        throw new InvalidParameterError(
            ErrorCode.InvalidParameter,
            "Token is not a valid Token object.",
            { params },
            "Please make sure it is a valid Token object",
            "https://docs.fun.xyz"
        )
    }
    const convertedAmount = await token.getDecimalAmount(amount)
    return ERC20_CONTRACT_INTERFACE.encodeTransactionParams(await token.getAddress(), "approve", [spender, convertedAmount])
}

export const erc721ApproveTransactionParams = async (params: ApproveERC721Params): Promise<TransactionParams> => {
    const { spender, tokenId, collection } = params
    if (!isAddress(spender ?? "")) {
        throw new InvalidParameterError(
            ErrorCode.InvalidParameter,
            "Spender address is not a valid address, please make sure it is a valid checksum address.",
            { params },
            "Please make sure it is a valid checksum address",
            "https://docs.fun.xyz"
        )
    }
    const tokenAddr = collection
    if (!isAddress(tokenAddr)) {
        throw new InvalidParameterError(
            ErrorCode.InvalidParameter,
            "Collection is not a valid address, please make sure it is a valid checksum address.",
            { params },
            "Please make sure it is a valid checksum address",
            "https://docs.fun.xyz"
        )
    }
    return ERC721_CONTRACT_INTERFACE.encodeTransactionParams(tokenAddr, "approve", [spender, tokenId])
}
