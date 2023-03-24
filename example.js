const { Eoa } = require("./auth")
const { configureEnvironment } = require("./managers")
const { FunWallet } = require("./wallet")
const { ethTransfer, erc20Transfer, swap, transfer } = require("./actions")
const { Chain, Token } = require("./data")
const { Contract } = require("ethers")
const { prefundWallet } = require("./utils/chain")

const options = {
    chain: 31337,
    apiKey: "localtest"
}

const spender = "0x3949c97925e5Aa13e34ddb18EAbf0B70ABB0C7d4"
const amount = 124
const token = "weth"

const swapParams = {
    in: "dai",
    out: "usdc",
    amount: 124,
}

const main = async () => {
    await configureEnvironment(options)

    const auth = new Eoa({ privateKey: "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d" })
    const salt = await auth.getUniqueId()

    const wallet = new FunWallet({ salt, index: 0 })
    // const address = await wallet.getAddress()
    const op1receipt = await wallet.approve(auth, { spender, amount, token })
}

const getBal = async (address, token) => {
    return (await Token.getBalance(token, address)).toString()
}

const getApprove = async (token, owner, spender) => {
    return (await Token.getApproval(token, owner, spender)).toString()
}

main()

