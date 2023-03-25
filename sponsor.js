const { Eoa } = require("./auth")
const { Token } = require("./data")
const { configureEnvironment } = require("./managers")
const { TokenSponsor } = require("./sponsors")
const { prefundWallet } = require("./utils")
const { FunWallet } = require("./wallet")


const options = {
    chain: 31337,
    apiKey: "localtest",
    gasSponsor: {
        sponsorAddress: "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
        token: "usdc"
    },
    sendTxLater: false
}

const spender = "0x3949c97925e5Aa13e34ddb18EAbf0B70ABB0C7d4"
const amount = 124
const token = "weth"


const sponsorAddress = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266"
const walletAddress = "0x76081ddeEA9200011F353bb890E215c6dd877F39"

const swapParams = {
    in: "eth",
    out: "dai",
    amount: .1,
    options: {
        returnAddress: sponsorAddress
    }
}

const main = async () => {
    await configureEnvironment(options)

    const funder = new Eoa({ privateKey: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80' })
    const funderAddr = await funder.getUniqueId()

    const auth = new Eoa({ privateKey: "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d" })
    const salt = await auth.getUniqueId()
    const wallet = new FunWallet({ salt, index: 0 })
    const walletAddress = await wallet.getAddress()

    const tx = await wallet.transfer(auth, { to: funderAddr, amount: 1000 })



}

const getBal = async (address, token) => {
    return (await Token.getBalance(token, address)).toString()
}

const getApprove = async (token, owner, spender) => {
    return (await Token.getApproval(token, owner, spender)).toString()
}

main()

