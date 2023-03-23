const { parseEther } = require("ethers/lib/utils")
const ERC20 = require('../abis/ERC20.json')
const ethers = require("ethers")

const ethTransfer = (to, value) => {
    return () => {
        const data = { to, data: "0x", value: parseEther(`${value}`) }
        return { data }
    }
}

const erc20Transfer = (tokenReceiver, amount, ERC20Token) => {
    return async () => {
        const ERC20Contract = new ethers.Contract(ERC20Token, ERC20.abi)
        const transferData = await ERC20Contract.populateTransaction.transfer(tokenReceiver, amount)
        return { to: ERC20Token, data: transferData }
    }
}

module.exports = { ethTransfer, erc20Transfer };