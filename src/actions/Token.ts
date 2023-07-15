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
import { ERC20_CONTRACT_INTERFACE, ERC721_CONTRACT_INTERFACE, TransactionData, WALLET_CONTRACT_INTERFACE } from "../common"
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

export const erc721TransferCalldata = async (params: ERC721TransferParams): Promise<Hex> => {
    const { to, tokenId, token, from } = params
    const transferData = await ERC721_CONTRACT_INTERFACE.encodeTransactionData(token, "transferFrom", [from, to, tokenId])

    return WALLET_CONTRACT_INTERFACE.encodeData("execFromEntryPoint", [token, 0, transferData.data])
}

export const erc20TransferCalldata = async (params: ERC20TransferParams): Promise<Hex> => {
    const { to, amount, token } = params
    const transferData = await ERC20_CONTRACT_INTERFACE.encodeTransactionData(token, "transfer", [to, amount])
    return WALLET_CONTRACT_INTERFACE.encodeData("execFromEntryPoint", [token, 0, transferData.data])
}

export const isERC20ApproveParams = (obj: ApproveParams): obj is ApproveERC20Params => {
    return "amount" in obj && "token" in obj
}

export const isERC721ApproveParams = (obj: ApproveParams): obj is ApproveERC721Params => {
    return "tokenId" in obj && "token" in obj
}

export const ethTransferCalldata = async (params: NativeTransferParams): Promise<Hex> => {
    const data: TransactionData = { to: params.to, data: "0x", value: parseEther(`${params.amount}`) }
    return WALLET_CONTRACT_INTERFACE.encodeData("execFromEntryPoint", [params.to, parseEther(`${params.amount}`), data.data])
}

export const erc20ApproveCalldata = async (params: ApproveERC20Params): Promise<Hex> => {
    const { spender, amount, token } = params
    const approveData = await ERC20_CONTRACT_INTERFACE.encodeTransactionData(token, "approve", [spender, amount])
    return WALLET_CONTRACT_INTERFACE.encodeData("execFromEntryPoint", [token, 0, approveData.data])
}

export const erc721ApproveCalldata = async (params: ApproveERC721Params): Promise<Hex> => {
    const { spender, tokenId, token } = params
    const approveData = await ERC721_CONTRACT_INTERFACE.encodeTransactionData(token, "approve", [spender, tokenId])
    return WALLET_CONTRACT_INTERFACE.encodeData("execFromEntryPoint", [token, 0, approveData.data])
}
