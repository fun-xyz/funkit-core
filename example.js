const { EoaAuth } = require("./auth")
const { configureEnvironment } = require("./managers")
const { prefundWallet } = require("./utils")
const { FunWallet } = require("./wallet")
const { ethTransfer } = require("./actions")

const options = {
    chain: 31337,
    apiKey: "localtest"
}

const to = "0x3949c97925e5Aa13e34ddb18EAbf0B70ABB0C7d4"
const value = 1


const main = async () => {
    await configureEnvironment(options)
    const auth = new EoaAuth({ privateKey: "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d" })
    const salt = await auth.getUniqueId()
    const wallet = new FunWallet()
    await wallet.init({ salt, index: 10 })
    await prefundWallet(auth, wallet, 1, options)
    const opreceipt = await wallet.execute(auth, ethTransfer(to, value))
    console.log(opreceipt)
}

main()