const { parseEther, parseUnits } = require("ethers/lib/utils")
const ERC20 = require('../abis/ERC20.json')
const ethers = require("ethers")
const { Token } = require("../data")

const ethTransfer = ({ to, value }) => {
    return () => {
        const data = { to, data: "0x", value: parseEther(`${value}`) }
        const gasInfo = { callGasLimit: 30_000 }
        return { data, gasInfo, location: "action.transfer.eth" }
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
        return { to: tokenAddress, gasInfo, data: transferData, errorData }
    }
}

module.exports = { ethTransfer, erc20Transfer };