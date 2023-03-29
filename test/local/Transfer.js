const { expect, assert } = require("chai")
const { Wallet } = require("ethers")
const { randomBytes } = require("ethers/lib/utils")
const { Eoa } = require("../../auth")
const { Token } = require("../../data")
const { configureEnvironment } = require("../../managers")
const { TEST_PRIVATE_KEY, prefundWallet, LOCAL_FORK_CHAIN_ID, REMOTE_FORK_CHAIN_ID } = require("../../utils")
const { FunWallet } = require("../../wallet")

const options = {
    chain: 31337,
    apiKey: "localtest",
}
const testToken = "usdc"

describe("Transfer", function () {
    this.timeout(90_000)
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
        wallet = new FunWallet({ salt, index: 253840 })
        await prefundWallet(auth, wallet, 10)
        const walletAddress = await wallet.getAddress()

        const tokenBalanceBefore = (await Token.getBalance(testToken, walletAddress))
        if (tokenBalanceBefore < amount) {
            await wallet.swap(auth, {
                in: "eth",
                amount: .1,
                out: testToken
            })
            const tokenBalanceAfter = (await Token.getBalance(testToken, walletAddress))
            assert(tokenBalanceAfter > tokenBalanceBefore, "Swap did not execute")
        }


    })

    it("wallet should have lower balance of specified token", async () => {
        var wallet1 = Wallet.createRandom();
        const randomAddress = wallet1.address
        const walletAddress = await wallet.getAddress()

        let b1 = Token.getBalance(testToken, randomAddress)
        let b2 = Token.getBalance(testToken, walletAddress)
        await wallet.transfer(auth, { to: randomAddress, amount, token: testToken })
        let b3 = Token.getBalance(testToken, randomAddress)
        let b4 = Token.getBalance(testToken, walletAddress)

        let [randomTokenBalanceBefore, walletTokenBalanceBefore, randomTokenBalanceAfter, walletTokenBalanceAfter] = await Promise.all([b1, b2, b3, b4])

        assert(randomTokenBalanceAfter - randomTokenBalanceBefore == amount, "Transfer failed")
        assert(walletTokenBalanceBefore - walletTokenBalanceAfter == amount, "Transfer failed")

    })

})