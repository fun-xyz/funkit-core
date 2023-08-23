import { Hex, isAddress, parseEther } from "viem"
import { ApproveERC20Params, ApproveERC721Params, ApproveParams, ERC721TransferParams, TokenTransferParams, TransferParams } from "./types"
import { ERC20_CONTRACT_INTERFACE, ERC721_CONTRACT_INTERFACE, TransactionParams } from "../common"
import { EnvOption } from "../config"
import { NFT, Token } from "../data"
import { ErrorCode, InvalidParameterError } from "../errors"
export const isERC721TransferParams = (obj: TransferParams): obj is ERC721TransferParams => {
    return "tokenId" in obj
}

export const isTokenTransferParams = (obj: TransferParams): obj is TokenTransferParams => {
    return "amount" in obj && "token" in obj && "to" in obj
}

export const erc721TransferTransactionParams = async (params: ERC721TransferParams): Promise<TransactionParams> => {
    const { to, tokenId, collection, from } = params
    let tokenAddr
    if (isAddress(collection)) {
        tokenAddr = collection
    } else {
        tokenAddr = await NFT.getAddress(collection)
    }
    return ERC721_CONTRACT_INTERFACE.encodeTransactionParams(tokenAddr, "transferFrom", [from, to, tokenId])
}

export const tokenTransferTransactionParams = async (
    params: TokenTransferParams,
    txOptions: EnvOption = (globalThis as any).globalEnvOption
): Promise<TransactionParams> => {
    const { to, amount, token } = params
    const tokenObj = new Token(token)
    if (tokenObj.isNative) {
        return { to: to, data: "0x" as Hex, value: parseEther(`${amount}`) }
    } else {
        const tokenAddr = await tokenObj.getAddress(txOptions)
        if (!tokenAddr) {
            throw new InvalidParameterError(
                ErrorCode.TokenNotFound,
                "Token address not found. Please check the token passed in.",
                { params },
                "Provide correct token.",
                "https://docs.fun.xyz"
            )
        }
        const convertedAmount = await tokenObj.getDecimalAmount(amount, txOptions)
        return ERC20_CONTRACT_INTERFACE.encodeTransactionParams(tokenAddr, "transfer", [to, convertedAmount])
    }
}

export const tokenTransferFromTransactionParams = async (
    params: TokenTransferParams,
    txOptions: EnvOption = (globalThis as any).globalEnvOption
): Promise<TransactionParams> => {
    const { to, amount, token, from } = params
    const tokenObj = new Token(token)
    if (tokenObj.isNative) {
        return { to: to, data: "0x" as Hex, value: parseEther(`${amount}`) }
    } else {
        const tokenAddr = await tokenObj.getAddress(txOptions)
        if (!tokenAddr) {
            throw new InvalidParameterError(
                ErrorCode.TokenNotFound,
                "Token address not found. Please check the token passed in.",
                { params },
                "Provide correct token.",
                "https://docs.fun.xyz"
            )
        }
        const convertedAmount = await tokenObj.getDecimalAmount(amount, txOptions)
        return ERC20_CONTRACT_INTERFACE.encodeTransactionParams(tokenAddr, "transferFrom", [from, to, convertedAmount])
    }
}

export const isERC20ApproveParams = (obj: ApproveParams): obj is ApproveERC20Params => {
    return "amount" in obj && "token" in obj
}

export const isERC721ApproveParams = (obj: ApproveParams): obj is ApproveERC721Params => {
    return "tokenId" in obj && "token" in obj
}

export const erc20ApproveTransactionParams = async (
    params: ApproveERC20Params,
    txOptions: EnvOption = (globalThis as any).globalEnvOption
): Promise<TransactionParams> => {
    const { spender, amount, token } = params
    const tokenObj = new Token(token)
    const convertedAmount = await tokenObj.getDecimalAmount(amount, txOptions)
    return ERC20_CONTRACT_INTERFACE.encodeTransactionParams(token, "approve", [spender, convertedAmount])
}

export const erc721ApproveTransactionParams = (params: ApproveERC721Params): TransactionParams => {
    const { spender, tokenId, token } = params
    return ERC721_CONTRACT_INTERFACE.encodeTransactionParams(token, "approve", [spender, tokenId])
}
