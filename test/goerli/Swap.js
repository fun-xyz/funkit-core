const { expect, assert } = require("chai")
const { Wallet } = require("ethers")
const { randomBytes } = require("ethers/lib/utils")
const { Eoa } = require("../../auth")
const { Token } = require("../../data")
const { configureEnvironment } = require("../../managers")
const { TEST_PRIVATE_KEY, prefundWallet, GOERLI_PRIVATE_KEY, TEST_API_KEY} = require("../testUtils")
const { FunWallet } = require("../../wallet")

const options = {
    chain: 5,
    apiKey: TEST_API_KEY,
    gasSponsor: ""

}
const testToken = "dai"
const weth = "0xb4fbf271143f4fbf7b91a5ded31805e42b2208d6"
describe("Swap", function () {
    this.timeout(60_000)
    let auth
    let wallet
    const amount = 1
    before(async function () {
        await configureEnvironment(options)
        auth = new Eoa({ privateKey: GOERLI_PRIVATE_KEY })
        salt = await auth.getUniqueId()
        wallet = new FunWallet({ salt, index: 236725 })
        // await prefundWallet(auth, wallet, .5)
    })

    it("ETH => ERC20", async () => {
        const walletAddress = await wallet.getAddress()
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
        const tokenBalanceBefore = (await Token.getBalance(weth, walletAddress))
        await wallet.swap(auth, {
            in: testToken,
            amount: 1,
            out: "weth"
        })
        const tokenBalanceAfter = (await Token.getBalance(weth, walletAddress))
        assert(tokenBalanceAfter > tokenBalanceBefore, "Swap did not execute")


    })

})