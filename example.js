const { Eoa } = require("./auth")
const { configureEnvironment } = require("./managers")
const { FunWallet } = require("./wallet")
const { ethTransfer, erc20Transfer } = require("./actions")
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



const main = async () => {
    await configureEnvironment(options)

    const auth = new Eoa({ privateKey: "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d" })
    // const auth = new Eoa({ privateKey: "0x01f3645a0c1b322e37fd6402253dd02c0b92e45b4dd072a9b6e76e4eb657345b" })
    const salt = await auth.getUniqueId()

    const wallet = new FunWallet({ salt, index: 0 })
    const address = await wallet.getAddress()
    await prefundWallet(auth, wallet, 1)
    const opreceipt = await wallet.execute(auth, erc20Transfer({ to, amount, token }))
    // const opreceipt = await wallet.execute(auth, ethTransfer(to, value))`
    console.log("token balance to:", (await getTokenBalance(to)).toString())
    console.log("token balance wallet:", (await getTokenBalance(address)).toString())
    console.log(opreceipt)
    getbalance(global.chain, to)

}

main()


const getTokenBalance = async (address, chainId = options.chain) => {
    const chain = new Chain({ chainId })
    const provider = await chain.getProvider()
    const tokenAbi = require("./abis/ERC20.json").abi
    const addr = await new Token(token).getAddress()
    const tokenContract = new Contract(addr, tokenAbi, provider)
    return tokenContract.balanceOf(address)
}