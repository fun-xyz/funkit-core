import { ActionData } from "./FirstClass"
import { NFT, Token } from "../data"
import { parseEther } from "ethers/lib/utils"
import { Helper, MissingParameterError } from "../errors"

export interface TransferParams {
    to: string
    amount?: number
    token?: string
    tokenId?: number
}

export interface ERC20TransferParams {
    to: string
    amount: number
    token: string
}

export interface ERC721TransferParams {
    to: string
    tokenId: number
    token: string
}

export interface NativeTransferParams {
    to: string
    amount: number
}

export interface ApproveParams {
    spender: string
    amount?: number
    tokenId?: number
    token: string
}

export interface ApproveERC20Params {
    spender: string
    amount: number
    token: string
}

export interface ApproveERC721Params {
    spender: string
    token: string
    tokenId: number
}

export const _transfer = (params: TransferParams) => {
    if (params.token) {
        if (params.tokenId) {
            return erc721Transfer({ to: params.to, tokenId: params.tokenId, token: params.token })
        }
        const token = new Token(params.token)
        if (!token.isNative && params.amount) {
            return erc20Transfer({ to: params.to, amount: params.amount, token: params.token })
        }
    }
    if (params.to && params.amount) {
        return ethTransfer({ to: params.to, amount: params.amount })
    }
    const currentLocation = "action.transfer"
    const helperMainMessage = "params were missing or incorrect"
    const helper = new Helper(`${currentLocation} was given these parameters`, params, helperMainMessage)
    throw new MissingParameterError(currentLocation, helper)
}

const ethTransfer = (params: NativeTransferParams) => {
    return () => {
        const data = { to: params.to, data: "0x", value: parseEther(`${params.amount}`) }
        const errorData = {
            location: "action.transfer.eth"
        }
        return { data, errorData }
    }
}

const erc20Transfer = (params: ERC20TransferParams) => {
    const { to, amount, token } = params
    return async (actionData: ActionData) => {
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

const erc721Transfer = (params: ERC721TransferParams) => {
    const { to, tokenId, token } = params
    return async (actionData: ActionData) => {
        const from = await actionData.wallet.getAddress()
        const transferData = await NFT.transfer(token!, from, to, tokenId, { chain: actionData.chain })

        const txDetails = {
            method: "transferFrom",
            params: [to, tokenId.toString()],
            contractAddress: token,
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

export const _approve = (params: ApproveParams) => {
    // Handle ERC20 Approves
    if (params.tokenId) {
        return erc721Approve({ spender: params.spender, tokenId: params.tokenId, token: params.token })
    }
    if (params.amount) {
        return erc20Approve({ spender: params.spender, amount: params.amount, token: params.token })
    }
    const currentLocation = "action.approve"
    const helperMainMessage = "params were missing or incorrect"
    const helper = new Helper(`${currentLocation} was given these parameters`, params, helperMainMessage)
    throw new MissingParameterError(currentLocation, helper)
}

const erc20Approve = (params: ApproveERC20Params) => {
    const { spender, amount, token } = params
    return async (actionData: ActionData) => {
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

const erc721Approve = (params: ApproveERC721Params) => {
    const { spender, tokenId, token } = params
    return async (actionData: ActionData) => {
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
