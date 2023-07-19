import { Hex, parseEther } from "viem"
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
import { Token } from "../data"
export const isERC721TransferParams = (obj: TransferParams): obj is ERC721TransferParams => {
    return "tokenId" in obj
}

export const isERC20TransferParams = (obj: TransferParams): obj is ERC20TransferParams => {
    return "amount" in obj && "token" in obj && !Token.isNative(obj.token)
}

export const isNativeTransferParams = (obj: TransferParams): obj is NativeTransferParams => {
    return "amount" in obj && (!("token" in obj) || Token.isNative(obj.token))
}

export const erc721TransferCalldata = async (params: ERC721TransferParams): Promise<TransactionParams> => {
    const { to, tokenId, token, from } = params
    const transferData = await ERC721_CONTRACT_INTERFACE.encodeTransactionData(token, "transferFrom", [from, to, tokenId])
    const transactionParams: TransactionParams = { to: token, data: transferData.data, value: 0 }
    return transactionParams
}

export const erc20TransferCalldata = async (params: ERC20TransferParams): Promise<TransactionParams> => {
    const { to, amount, token } = params
    const transferData = ERC20_CONTRACT_INTERFACE.encodeTransactionData(token, "transfer", [to, amount])
    const transactionParams: TransactionParams = { to: token, data: transferData.data, value: 0 }
    return transactionParams
}

export const isERC20ApproveParams = (obj: ApproveParams): obj is ApproveERC20Params => {
    return "amount" in obj && "token" in obj
}

export const isERC721ApproveParams = (obj: ApproveParams): obj is ApproveERC721Params => {
    return "tokenId" in obj && "token" in obj
}

export const ethTransferCalldata = async (params: NativeTransferParams): Promise<TransactionParams> => {
    const transactionParams: TransactionParams = { to: params.to, data: "0x" as Hex, value: parseEther(`${params.amount}`) }
    return transactionParams
}

export const erc20ApproveCalldata = async (params: ApproveERC20Params): Promise<TransactionParams> => {
    const { spender, amount, token } = params
    const approveData = ERC20_CONTRACT_INTERFACE.encodeTransactionData(token, "approve", [spender, amount])
    const transactionParams: TransactionParams = { to: token, data: approveData.data, value: 0 }
    return transactionParams
}

export const erc721ApproveCalldata = async (params: ApproveERC721Params): Promise<TransactionParams> => {
    const { spender, tokenId, token } = params
    const approveData = ERC721_CONTRACT_INTERFACE.encodeTransactionData(token, "approve", [spender, tokenId])
    const transactionParams: TransactionParams = { to: token, data: approveData.data, value: 0 }
    return transactionParams
}
