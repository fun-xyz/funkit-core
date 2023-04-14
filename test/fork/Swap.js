const { expect, assert } = require("chai")
const { Wallet } = require("ethers")
const { randomBytes } = require("ethers/lib/utils")
const { Eoa } = require("../../auth")
const { Token } = require("../../data")
const { configureEnvironment } = require("../../managers")
const { TEST_PRIVATE_KEY, prefundWallet, LOCAL_FORK_CHAIN_ID, FUN_TESTNET_CHAIN_ID, TEST_API_KEY } = require("../../utils")
const { FunWallet } = require("../../wallet")

const testToken = "dai"

describe("Swap", function () {
    this.timeout(100_000)
    let auth
    let wallet
    var REMOTE_TEST = process.env.REMOTE_TEST;
    const FORK_CHAIN_ID = REMOTE_TEST === 'true' ? FUN_TESTNET_CHAIN_ID : LOCAL_FORK_CHAIN_ID
    const options = {
        chain: FORK_CHAIN_ID,
        apiKey: TEST_API_KEY,
        gasSponsor: ""
    }

    const amount = 1
    before(async function () {
        await configureEnvironment(options)
        auth = new Eoa({ privateKey: TEST_PRIVATE_KEY })
        salt = await auth.getUniqueId()
        wallet = new FunWallet({ salt, index: 23420 })
        await prefundWallet(auth, wallet, 10)
    })

    it("ETH => ERC20", async () => {
        const walletAddress = await wallet.getAddress()

        const tokenBalanceBefore = (await Token.getBalance(testToken, walletAddress))
        const receipt = await wallet.swap(auth, {
            in: "eth",
            amount: .1,
            out: testToken
        })

        const tokenBalanceAfter = (await Token.getBalance(testToken, walletAddress))
        assert(tokenBalanceAfter > tokenBalanceBefore, "Swap did not execute")

    })

    it("ERC20 => ERC20", async () => {
        this.timeout(100_000)
        const walletAddress = await wallet.getAddress()
        const tokenBalanceBefore = (await Token.getBalance(testToken, walletAddress))
        await wallet.swap(auth, {
            in: testToken,
            amount: 1,
            out: "usdc"
        })
        const tokenBalanceAfter = (await Token.getBalance(testToken, walletAddress))
        assert(tokenBalanceAfter < tokenBalanceBefore, "Swap did not execute")
    })

})