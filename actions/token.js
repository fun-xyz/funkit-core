const { parseEther, parseUnits } = require("ethers/lib/utils")
const ERC20 = require('../abis/ERC20.json')
const ethers = require("ethers")
const { Token } = require("../data")

const ethTransfer = ({ to, amount }) => {
    return () => {
        const data = { to, data: "0x", value: parseEther(`${amount}`) }
        const gasInfo = { callGasLimit: 30_000 }
        const errorData = {
            location: "action.transfer.eth",
        }
        return { data, gasInfo, errorData }
    }
}

const erc20Transfer = ({ to, amount, token }) => {
    return async (actionData) => {
        const { wallet, chain, options } = actionData
        const provider = await chain.getProvider()
        token = new Token(token)
        tokenAddress = await token.getAddress()
        const ERC20Contract = new ethers.Contract(tokenAddress, ERC20.abi, provider)
        const decimals = await ERC20Contract.decimals()

        amount = parseUnits(`${amount}`, decimals)


        const transferData = await ERC20Contract.populateTransaction.transfer(to, amount)


        const txDetails = {
            method: "transfer",
            params: [to, amount.toString()],
            contractAddress: tokenAddress,
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


        const gasInfo = { callGasLimit: 100_000 }
        return { gasInfo, data: transferData, errorData }
    }
}

const _approve = ({ spender, amount, token }) => {
    return async (actionData) => {
        const { wallet, chain, options } = actionData
        const provider = await chain.getProvider()
        token = new Token(token)
        tokenAddress = await token.getAddress()
        const ERC20Contract = new ethers.Contract(tokenAddress, ERC20.abi, provider)
        const decimals = await ERC20Contract.decimals()

        amount = parseUnits(`${amount}`, decimals)

        const approveData = await ERC20Contract.populateTransaction.approve(spender, amount)


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

        const gasInfo = { callGasLimit: 100_000 }
        return { gasInfo, data: approveData, errorData }
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