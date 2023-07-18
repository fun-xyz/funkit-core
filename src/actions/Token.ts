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
import { Auth } from "../auth"
import { ERC20_CONTRACT_INTERFACE, ERC721_CONTRACT_INTERFACE } from "../common"
import { EnvOption } from "../config"
import { Token } from "../data"
import { FunWallet } from "../wallet"
export const isERC721TransferParams = (obj: TransferParams): obj is ERC721TransferParams => {
    return "tokenId" in obj
}

export const isERC20TransferParams = (obj: TransferParams): obj is ERC20TransferParams => {
    return "amount" in obj && "token" in obj && !Token.isNative(obj.token)
}

export const isNativeTransferParams = (obj: TransferParams): obj is NativeTransferParams => {
    return "amount" in obj && (!("token" in obj) || Token.isNative(obj.token))
}

export const erc721TransferCalldata = async (
    auth: Auth,
    userId: string,
    params: ERC721TransferParams,
    txOptions: EnvOption
): Promise<Hex> => {
    const { to, tokenId, token, from } = params
    const transferData = await ERC721_CONTRACT_INTERFACE.encodeTransactionData(token, "transferFrom", [from, to, tokenId])
    const transactionParams = { to: token, data: transferData.data, value: 0 }
    return await FunWallet.execFromEntryPoint(auth, userId, transactionParams, txOptions)
}

export const erc20TransferCalldata = async (
    auth: Auth,
    userId: string,
    params: ERC20TransferParams,
    txOptions: EnvOption
): Promise<Hex> => {
    const { to, amount, token } = params
    const transferData = ERC20_CONTRACT_INTERFACE.encodeTransactionData(token, "transfer", [to, amount])
    const transactionParams = { to: token, data: transferData.data, value: 0 }
    return await FunWallet.execFromEntryPoint(auth, userId, transactionParams, txOptions)
}

export const isERC20ApproveParams = (obj: ApproveParams): obj is ApproveERC20Params => {
    return "amount" in obj && "token" in obj
}

export const isERC721ApproveParams = (obj: ApproveParams): obj is ApproveERC721Params => {
    return "tokenId" in obj && "token" in obj
}

export const ethTransferCalldata = async (auth: Auth, userId: string, params: NativeTransferParams, txOptions: EnvOption): Promise<Hex> => {
    const transactionParams = { to: params.to, data: "0x" as Hex, value: parseEther(`${params.amount}`) }
    return await FunWallet.execFromEntryPoint(auth, userId, transactionParams, txOptions)
}

export const erc20ApproveCalldata = async (auth: Auth, userId: string, params: ApproveERC20Params, txOptions: EnvOption): Promise<Hex> => {
    const { spender, amount, token } = params
    const approveData = ERC20_CONTRACT_INTERFACE.encodeTransactionData(token, "approve", [spender, amount])
    const transactionParams = { to: token, data: approveData.data, value: 0 }
    return FunWallet.execFromEntryPoint(auth, userId, transactionParams, txOptions)
}

export const erc721ApproveCalldata = async (
    auth: Auth,
    userId: string,
    params: ApproveERC721Params,
    txOptions: EnvOption
): Promise<Hex> => {
    const { spender, tokenId, token } = params
    const approveData = ERC721_CONTRACT_INTERFACE.encodeTransactionData(token, "approve", [spender, tokenId])
    const transactionParams = { to: token, data: approveData.data, value: 0 }
    return FunWallet.execFromEntryPoint(auth, userId, transactionParams, txOptions)
}
