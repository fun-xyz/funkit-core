const { parseEther, parseUnits } = require("ethers/lib/utils")
const ERC20 = require('../abis/ERC20.json')
const ethers = require("ethers")
const { Token } = require("../data")

const ethTransfer = ({ to, amount }) => {
    return () => {
        const data = { to, data: "0x", value: parseEther(`${amount}`) }
        const errorData = {
            location: "action.transfer.eth",
        }
        return { data, errorData }
    }
}

const erc20Transfer = ({ to, amount, token }) => {
    return async (actionData) => {
        const { wallet, chain, options } = actionData
        const transferData = await Token.transfer(token, to, amount, { chain })

        const txDetails = {
            method: "transfer",
            params: [to, amount.toString()],
            contractAddress: transferData.to,
            chainId: chain.id,
        }

        const reasonData = {
            title: "Possible reasons:",
            reasons: [
                "Don't have a token balance",
                "Incorrect token address",
                "Incorrect parameters",
            ],
        }

        const errorData = {
            location: "action.transfer.erc20",
            error: {
                txDetails, reasonData
            }
        }


        return { data: transferData, errorData }
    }
}

const _approve = ({ spender, amount, token }) => {
    return async (actionData) => {
        const { wallet, chain, options } = actionData
        token = new Token(token)
        const approveData = await token.approve(spender, amount, { chain })
        const tokenAddress = await token.getAddress()
        const txDetails = {
            method: "approve",
            params: [spender, amount.toString()],
            contractAddress: tokenAddress,
            chainId: chain.id,
        }

        const reasonData = {
            title: "Possible reasons:",
            reasons: [
                "Incorrect parameters",
            ],
        }

        const errorData = {
            location: "action.approve.erc20",
            error: {
                txDetails, reasonData
            }
        }

        return { data: approveData, errorData }
    }
}

const _transfer = (params) => {
    if (params.token) {
        const token = new Token(params.token)
        if (!token.isNative) {
            return erc20Transfer(params)
        }
    }
    return ethTransfer(params)
}

module.exports = { _transfer, _approve };