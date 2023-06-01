import { ActionData } from "./FirstClass"
import { Token } from "../data"
import { parseEther } from "ethers/lib/utils"

export type TransferParams = {
    to: string
    amount: number
    token?: string
}

export type ApproveParams = {
    spender: string
    amount: number
    token: string
}

export const _transfer = (params: TransferParams) => {
    if (params.token) {
        const token = new Token(params.token)
        if (!token.isNative) {
            return erc20Transfer(params)
        }
    }
    return ethTransfer(params)
}

const ethTransfer = (params: TransferParams) => {
    return () => {
        const data = { to: params.to, data: "0x", value: parseEther(`${params.amount}`) }
        const errorData = {
            location: "action.transfer.eth"
        }
        return { data, errorData }
    }
}

const erc20Transfer = (params: TransferParams) => {
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

export const _approve = (params: ApproveParams) => {
    return async (actionData: ActionData) => {
        const token = new Token(params.token)
        const approveData = await token.approve(params.spender, params.amount, { chain: actionData.chain })
        const tokenAddress = await token.getAddress()
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
