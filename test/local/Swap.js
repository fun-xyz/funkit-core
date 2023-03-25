const { expect, assert } = require("chai")
const { Wallet } = require("ethers")
const { randomBytes } = require("ethers/lib/utils")
const { Eoa } = require("../../auth")
const { Token } = require("../../data")
const { configureEnvironment } = require("../../managers")
const { TEST_PRIVATE_KEY, prefundWallet, LOCAL_FORK_CHAIN_ID, REMOTE_FORK_CHAIN_ID } = require("../../utils")
const { FunWallet } = require("../../wallet")

const testTokens = ["usdc", "dai"]

describe("Swap", function () {
    this.timeout(100_000)
    let auth
    let wallet
    var REMOTE_FORK_TEST = process.env.REMOTE_FORK_TEST;
    const FORK_CHAIN_ID = REMOTE_FORK_TEST === 'true' ? REMOTE_FORK_CHAIN_ID : LOCAL_FORK_CHAIN_ID
    const options = {
        chain: FORK_CHAIN_ID,
        apiKey: "localtest",
    }

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
    // it("ERC20 => ERC20", async () => {
    //     this.timeout(100_000)
    //     const walletAddress = await wallet.getAddress()
    //     for (let testToken of testTokens) {
    //         if (testToken != "usdc") {
    //             const tokenBalanceBefore = (await Token.getBalance(testToken, walletAddress))
    //             await wallet.swap(auth, {
    //                 in: "usdc",
    //                 amount: 1,
    //                 out: testToken
    //             })
    //             const tokenBalanceAfter = (await Token.getBalance(testToken, walletAddress))
    //             assert(tokenBalanceAfter > tokenBalanceBefore, "Swap did not execute")
    //         }
    //     }
    // })

})