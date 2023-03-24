const { Eoa } = require("./auth")
const { configureEnvironment } = require("./managers")
const { FunWallet } = require("./wallet")
const { ethTransfer, erc20Transfer, swap } = require("./actions")
const { Chain, Token } = require("./data")
const { Contract } = require("ethers")
const { prefundWallet } = require("./utils/chain")

const options = {
    chain: 31337,
    apiKey: "localtest"
}

const to = "0x3949c97925e5Aa13e34ddb18EAbf0B70ABB0C7d4"
const amount = 1
const token = "weth"

const getbalance = async (chain, to) => {
    const provider = await chain.getProvider()
    const amount = await provider.getBalance(to)
    console.log(amount.toString())
}

const swapParams = {
    tokenIn: "eth",
    tokenOut: "dai",
    amountIn: 1,
}

const main = async () => {
    await configureEnvironment(options)

    const auth = new Eoa({ privateKey: "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d" })
    // const auth = new Eoa({ privateKey: "0x01f3645a0c1b322e37fd6402253dd02c0b92e45b4dd072a9b6e76e4eb657345b" })
    const salt = await auth.getUniqueId()

    const wallet = new FunWallet({ salt, index: 0 })
    const address = await wallet.getAddress()
    console.log("token balance start:", await getBal(address))
    await prefundWallet(auth, wallet, 1)
    const opreceipt = await wallet.execute(auth, swap(swapParams))
    console.log("token balance end:", await getBal(address))
    console.log(opreceipt)
}

const getBal = async (address, token = swapParams.tokenIn) => {
    return (await Token.getBalance(token, address)).toString()
}

main()

