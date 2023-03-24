const { expect, assert } = require("chai")
const { Wallet } = require("ethers")
const { randomBytes } = require("ethers/lib/utils")
const { Eoa } = require("../../auth")
const { Token } = require("../../data")
const { configureEnvironment } = require("../../managers")
const { prefundWallet, GOERLI_PRIVATE_KEY } = require("../../utils")
const { FunWallet } = require("../../wallet")

const options = {
    chain: 5,
    apiKey: "localtest",
}
const testToken = "0xdc31Ee1784292379Fbb2964b3B9C4124D8F89C60"
const testToken2 = "0x07865c6E87B9F70255377e024ace6630C1Eaa37F"

describe("Swap", function () {
    this.timeout(90_000)
    let auth
    let wallet
    const amount = 1
    before(async function () {
        await configureEnvironment(options)
        auth = new Eoa({ privateKey: GOERLI_PRIVATE_KEY })
        salt = await auth.getUniqueId()
        wallet = new FunWallet({ salt, index: 1 })
        // await prefundWallet(auth, wallet, .2)
    })

    it("ETH => ERC20", async () => {
        const walletAddress = await wallet.getAddress()
        console.log(walletAddress)
        const tokenBalanceBefore = (await Token.getBalance(testToken, walletAddress))
        await wallet.swap(auth, {
            in: "eth",
            amount: .01,
            out: testToken
        })
        const tokenBalanceAfter = (await Token.getBalance(testToken, walletAddress))
        assert(tokenBalanceAfter > tokenBalanceBefore, "Swap did not execute")

    })
    it("ERC20 => ERC20", async () => {
        const walletAddress = await wallet.getAddress()
        const tokenBalanceBefore = (await Token.getBalance(testToken, walletAddress))
        console.log(tokenBalanceBefore)
        await wallet.swap(auth, {
            in: testToken,
            amount: 1,
            out: testToken2
        })
        const tokenBalanceAfter = (await Token.getBalance(testToken, walletAddress))
        assert(tokenBalanceAfter > tokenBalanceBefore, "Swap did not execute")
    })

})