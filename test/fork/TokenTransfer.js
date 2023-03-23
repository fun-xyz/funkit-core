const { EoaAuth } = require("../../auth")
const { configureEnvironment } = require("../../managers")
const { prefundWallet } = require("../../utils")
const { FunWallet } = require("../../wallet")
const { TokenTransfer } = require("../../modules/TokenTransfer")
const { DAI_ADDR } = require("../TestUtils")
const options = {
    chain: 31337,
    apiKey: "localtest"
}

const to = "0x3949c97925e5Aa13e34ddb18EAbf0B70ABB0C7d4"
const value = 1

const getbalance = async (chain, to) => {
    const provider = await chain.getProvider()
    const amount = await provider.getBalance(to)
    console.log(amount.toString())

}

const main = async () => {
    await configureEnvironment(options)

    const auth = new EoaAuth({ privateKey: "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d" })
    const salt = await auth.getUniqueId()

    getbalance(global.chain, to)

    const wallet = new FunWallet()
    wallet.init({ salt })

    await prefundWallet(auth, wallet, 1)
    // const funderWalletErc20BalanceStart = await getAddrBalanceErc(eoa, DAI_ADDR, funder.address)

    const tx = TokenTransfer.createTransferTx(auth.signer.address, 5, DAI_ADDR)
    const opreceipt = await wallet.execute(auth, tx)
    // const funderWalletErc20BalanceEnd = await getAddrBalanceErc(eoa, DAI_ADDR, funder.address)

    console.log(opreceipt)
    // console.log(Math.floor(funderWalletErc20BalanceEnd - funderWalletErc20BalanceStart))

    getbalance(global.chain, to)
}


main()