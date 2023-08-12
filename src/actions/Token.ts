import { Hex, isAddress, parseEther } from "viem"
import {
    ApproveERC20Params,
    ApproveERC721Params,
    ApproveParams,
    ERC20TransferParams,
    ERC721TransferParams,
    NativeTransferParams,
    TransferParams
} from "./types"
import { ERC20_CONTRACT_INTERFACE, ERC721_CONTRACT_INTERFACE, TransactionParams } from "../common"
import { NFT, Token } from "../data"
export const isERC721TransferParams = (obj: TransferParams): obj is ERC721TransferParams => {
    return "tokenId" in obj
}

export const isERC20TransferParams = (obj: TransferParams): obj is ERC20TransferParams => {
    return "amount" in obj && "token" in obj && !Token.isNative(obj.token)
}

export const isNativeTransferParams = (obj: TransferParams): obj is NativeTransferParams => {
    return "amount" in obj && (!("token" in obj) || Token.isNative(obj.token))
}

export const erc721TransferTransactionParams = (params: ERC721TransferParams): TransactionParams => {
    const { to, tokenId, token, from } = params
    let tokenAddr
    if (isAddress(token)) {
        tokenAddr = token
    } else {
        tokenAddr = NFT.getAddress(token)
    }
    return ERC721_CONTRACT_INTERFACE.encodeTransactionParams(tokenAddr, "transferFrom", [from, to, tokenId])
}

export const erc20TransferTransactionParams = (params: ERC20TransferParams): TransactionParams => {
    const { to, amount, token } = params
    let tokenAddr
    if (isAddress(token)) {
        tokenAddr = token
    } else {
        tokenAddr = Token.getAddress(token)
    }
    return ERC20_CONTRACT_INTERFACE.encodeTransactionParams(tokenAddr, "transfer", [to, amount])
}

export const isERC20ApproveParams = (obj: ApproveParams): obj is ApproveERC20Params => {
    return "amount" in obj && "token" in obj
}

export const isERC721ApproveParams = (obj: ApproveParams): obj is ApproveERC721Params => {
    return "tokenId" in obj && "token" in obj
}

export const ethTransferTransactionParams = (params: NativeTransferParams): TransactionParams => {
    return { to: params.to, data: "0x" as Hex, value: parseEther(`${params.amount}`) }
}

export const erc20ApproveTransactionParams = (params: ApproveERC20Params): TransactionParams => {
    const { spender, amount, token } = params
    return ERC20_CONTRACT_INTERFACE.encodeTransactionParams(token, "approve", [spender, amount])
}

export const erc721ApproveTransactionParams = (params: ApproveERC721Params): TransactionParams => {
    const { spender, tokenId, token } = params
    return ERC721_CONTRACT_INTERFACE.encodeTransactionParams(token, "approve", [spender, tokenId])
}
