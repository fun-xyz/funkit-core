import { parseEther } from "viem"
import {
    ActionData,
    ActionFunction,
    ActionResult,
    ApproveERC20Params,
    ApproveERC721Params,
    ApproveParams,
    ERC20TransferParams,
    ERC721TransferParams,
    NativeTransferParams,
    TransferParams
} from "./types"
import { TransactionData } from "../common"
import { NFT, Token } from "../data"
import { ErrorData, ErrorTransactionDetails, Helper, MissingParameterError } from "../errors"
function isERC721TransferParams(obj: TransferParams): obj is ERC721TransferParams {
    return "tokenId" in obj
}

function isERC20TransferParams(obj: TransferParams): obj is ERC20TransferParams {
    return "amount" in obj && "token" in obj && !Token.isNative(obj.token)
}

function isNativeTransferParams(obj: TransferParams): obj is NativeTransferParams {
    return "amount" in obj && (!("token" in obj) || Token.isNative(obj.token))
}

export const _transfer = (params: TransferParams): ActionFunction => {
    if (isERC721TransferParams(params)) {
        return erc721Transfer(params)
    }
    if (isERC20TransferParams(params)) {
        return erc20Transfer(params)
    }
    if (isNativeTransferParams(params)) {
        return ethTransfer(params)
    }
    const currentLocation = "action.transfer"
    const helperMainMessage = "params were missing or incorrect"
    const helper = new Helper(`${currentLocation} was given these parameters`, params, helperMainMessage)
    throw new MissingParameterError(currentLocation, helper)
}

const ethTransfer = (params: NativeTransferParams): ActionFunction => {
    return async (): Promise<ActionResult> => {
        const data: TransactionData = { to: params.to, data: "0x", value: parseEther(`${params.amount}`) }
        const errorData: ErrorData = {
            location: "action.transfer.eth"
        }
        return { data, errorData }
    }
}

const erc20Transfer = (params: ERC20TransferParams): ActionFunction => {
    const { to, amount, token } = params
    return async (actionData: ActionData): Promise<ActionResult> => {
        const transferData = await Token.transfer(token!, to, amount, { chain: actionData.chain })

        const txDetails = {
            method: "transfer",
            params: [to, amount.toString()],
            contractAddress: transferData.to,
            chainId: actionData.chain.id
        }

        const reasonData = {
            title: "Possible reasons:",
            reasons: ["Don't have a token balance", "Incorrect token address", "Incorrect parameters"]
        }

        const errorData = {
            location: "action.transfer.erc20",
            error: {
                txDetails,
                reasonData
            }
        }
        return { data: transferData, errorData }
    }
}

const erc721Transfer = (params: ERC721TransferParams): ActionFunction => {
    const { to, tokenId, token } = params
    return async (actionData: ActionData): Promise<ActionResult> => {
        const from = await actionData.wallet.getAddress()
        const transferData = await NFT.transfer(token!, from, to, tokenId, { chain: actionData.chain })

        const txDetails: ErrorTransactionDetails = {
            method: "transferFrom",
            params: [to, tokenId.toString()],
            contractAddress: token,
            chainId: actionData.chain.id!
        }

        const reasonData = {
            title: "Possible reasons:",
            reasons: ["Don't have a token balance", "Incorrect token address", "Incorrect parameters"]
        }

        const errorData = {
            location: "action.transfer.erc20",
            error: {
                txDetails,
                reasonData
            }
        }
        return { data: transferData, errorData }
    }
}

function isERC20ApproveParams(obj: ApproveParams): obj is ApproveERC20Params {
    return "amount" in obj && "token" in obj
}
function isERC721ApproveParams(obj: ApproveParams): obj is ApproveERC721Params {
    return "tokenId" in obj && "token" in obj
}
export const _approve = (params: ApproveParams): ActionFunction => {
    // Handle ERC20 Approves
    if (isERC721ApproveParams(params)) {
        return erc721Approve(params)
    }
    if (isERC20ApproveParams(params)) {
        return erc20Approve(params)
    }
    const currentLocation = "action.approve"
    const helperMainMessage = "params were missing or incorrect"
    const helper = new Helper(`${currentLocation} was given these parameters`, params, helperMainMessage)
    throw new MissingParameterError(currentLocation, helper)
}

const erc20Approve = (params: ApproveERC20Params): ActionFunction => {
    const { spender, amount, token } = params
    return async (actionData: ActionData): Promise<ActionResult> => {
        const erc20token = new Token(token)
        const approveData = await erc20token.approve(spender, amount, { chain: actionData.chain })
        const tokenAddress = await erc20token.getAddress()
        const txDetails = {
            method: "approve",
            params: [params.spender, params.amount.toString()],
            contractAddress: tokenAddress,
            chainId: actionData.chain.id
        }

        const reasonData = {
            title: "Possible reasons:",
            reasons: ["Incorrect parameters"]
        }

        const errorData = {
            location: "action.approve.erc20",
            error: {
                txDetails,
                reasonData
            }
        }
        return { data: approveData, errorData }
    }
}

const erc721Approve = (params: ApproveERC721Params): ActionFunction => {
    const { spender, tokenId, token } = params
    return async (actionData: ActionData): Promise<ActionResult> => {
        const erc721token = new NFT(token)
        const approveData = await erc721token.approve(spender, tokenId, { chain: actionData.chain })
        const tokenAddress = await erc721token.getAddress()
        const txDetails = {
            method: "approve",
            params: [spender, tokenId.toString()],
            contractAddress: tokenAddress,
            chainId: actionData.chain.id
        }

        const reasonData = {
            title: "Possible reasons:",
            reasons: ["Incorrect parameters"]
        }

        const errorData = {
            location: "action.approve.erc721",
            error: {
                txDetails,
                reasonData
            }
        }
        return { data: approveData, errorData }
    }
}
