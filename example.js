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
const amount = 3452345
const token = "weth"

const swapParams = {
    in: "eth",
    out: "dai",
    amount: 1,
}

const main = async () => {
    await configureEnvironment(options)

    const auth = new Eoa({ privateKey: "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d" })
    // const auth = new Eoa({ privateKey: "0x01f3645a0c1b322e37fd6402253dd02c0b92e45b4dd072a9b6e76e4eb657345b" })
    const salt = await auth.getUniqueId()

    const wallet = new FunWallet({ salt, index: 0 })
    const address = await wallet.getAddress()
    await prefundWallet(auth, wallet, 10)
    // console.log("start token end:", await getBal(address, swapParams.tokenOut))
    // console.log("start token in:", await getBal(address, swapParams.tokenIn))

    // await prefundWallet(auth, wallet, 1)
    // console.log("start token end:", await getBal(address, swapParams.tokenIn))
    console.log("start token end:", await getBal(address, swapParams.out))
    console.log("start token end:", await getBal(address, swapParams.in))

    // const op1receipt = await wallet.transfer(auth, { to, amount, token })
    const op2receipt = await wallet.swap(auth, swapParams)
    console.log(op2receipt)
    console.log("start token end:", await getBal(address, swapParams.out))

    // console.log("token balance start:", await getBal(address, swapParams.tokenOut))
    // console.log("token balance start:", await getApprove(token, address, spender,))


}

const getBal = async (address, token) => {
    return (await Token.getBalance(token, address)).toString()
}

const getApprove = async (token, owner, spender) => {
    return (await Token.getApproval(token, owner, spender)).toString()
}

main()

