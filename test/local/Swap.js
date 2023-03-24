const { expect, assert } = require("chai")
const { Wallet } = require("ethers")
const { randomBytes } = require("ethers/lib/utils")
const { Eoa } = require("../../auth")
const { Token } = require("../../data")
const { configureEnvironment } = require("../../managers")
const { TEST_PRIVATE_KEY, prefundWallet } = require("../../utils")
const { FunWallet } = require("../../wallet")

const options = {
    chain: 31337,
    apiKey: "localtest",
}
const testTokens = ["usdc", "dai"]

describe("Swap", function () {
    this.timeout(30_000)
    let auth
    let wallet
    const amount = 1
    before(async function () {
        await configureEnvironment(options)
        auth = new Eoa({ privateKey: TEST_PRIVATE_KEY })
        salt = await auth.getUniqueId()
        wallet = new FunWallet({ salt, index: 0 })
        await prefundWallet(auth, wallet, .4)
    })

    it("ETH => ERC20", async () => {
        const walletAddress = await wallet.getAddress()
        for (let testToken of testTokens) {
            const tokenBalanceBefore = (await Token.getBalance(testToken, walletAddress))
            await wallet.swap(auth, {
                in: "eth",
                amount: .1,
                out: testToken
            })
            const tokenBalanceAfter = (await Token.getBalance(testToken, walletAddress))
            assert(tokenBalanceAfter > tokenBalanceBefore, "Swap did not execute")
        }
    })
    it("ERC20 => ERC20", async () => {
        const walletAddress = await wallet.getAddress()
        for (let testToken of testTokens) {
            if (testToken != "usdc") {
                const tokenBalanceBefore = (await Token.getBalance(testToken, walletAddress))
                console.log(tokenBalanceBefore)
                await wallet.swap(auth, {
                    in: "usdc",
                    amount: 1,
                    out: testToken
                })
                const tokenBalanceAfter = (await Token.getBalance(testToken, walletAddress))
                assert(tokenBalanceAfter > tokenBalanceBefore, "Swap did not execute")
            }
        }
    })

})