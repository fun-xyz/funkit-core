import { Hex, isAddress, parseEther, parseUnits } from "viem"
import { ApproveERC20Params, ApproveERC721Params, ApproveParams, ERC721TransferParams, TokenTransferParams, TransferParams } from "./types"
import { ERC20_CONTRACT_INTERFACE, ERC721_CONTRACT_INTERFACE, TransactionParams } from "../common"
import { NFT, Token } from "../data"
import { ErrorCode, InvalidParameterError } from "../errors"
export const isERC721TransferParams = (obj: TransferParams): obj is ERC721TransferParams => {
    return "tokenId" in obj
}

export const isTokenTransferParams = (obj: TransferParams): obj is TokenTransferParams => {
    return "amount" in obj && "token" in obj && "to" in obj
}

export const erc721TransferTransactionParams = async (params: ERC721TransferParams): Promise<TransactionParams> => {
    const { to, tokenId, token, from } = params
    let tokenAddr
    if (isAddress(token)) {
        tokenAddr = token
    } else {
        tokenAddr = await NFT.getAddress(token)
    }
    return ERC721_CONTRACT_INTERFACE.encodeTransactionParams(tokenAddr, "transferFrom", [from, to, tokenId])
}

export const tokenTransferTransactionParams = async (params: TokenTransferParams): Promise<TransactionParams> => {
    const { to, amount, token } = params
    const tokenObj = new Token(token)
    if (tokenObj.isNative) {
        return { to: to, data: "0x" as Hex, value: parseEther(`${amount}`) }
    } else {
        const tokenAddr = await tokenObj.getAddress()
        if (!tokenAddr) {
            throw new InvalidParameterError(
                ErrorCode.TokenNotFound,
                "Token address not found. Please check the token passed in.",
                "wallet.transfer",
                { params },
                "Provide correct token.",
                "https://docs.fun.xyz"
            )
        }
        const convertedAmount = parseUnits(`${amount}`, Number(await tokenObj.getDecimals()))
        return ERC20_CONTRACT_INTERFACE.encodeTransactionParams(tokenAddr, "transfer", [to, convertedAmount])
    }
}

export const isERC20ApproveParams = (obj: ApproveParams): obj is ApproveERC20Params => {
    return "amount" in obj && "token" in obj
}

export const isERC721ApproveParams = (obj: ApproveParams): obj is ApproveERC721Params => {
    return "tokenId" in obj && "token" in obj
}

export const erc20ApproveTransactionParams = async (params: ApproveERC20Params): Promise<TransactionParams> => {
    const { spender, amount, token } = params
    const tokenObj = new Token(token)
    const convertedAmount = parseUnits(`${amount}`, Number(await tokenObj.getDecimals()))
    return ERC20_CONTRACT_INTERFACE.encodeTransactionParams(token, "approve", [spender, convertedAmount])
}

export const erc721ApproveTransactionParams = (params: ApproveERC721Params): TransactionParams => {
    const { spender, tokenId, token } = params
    return ERC721_CONTRACT_INTERFACE.encodeTransactionParams(token, "approve", [spender, tokenId])
}
