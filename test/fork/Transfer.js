const { expect, assert } = require("chai")
const { Wallet } = require("ethers")
const { randomBytes } = require("ethers/lib/utils")
const { Eoa } = require("../../auth")
const { Token } = require("../../data")
const { configureEnvironment } = require("../../managers")
const { TEST_PRIVATE_KEY, prefundWallet, LOCAL_FORK_CHAIN_ID, FUN_TESTNET_CHAIN_ID, getTestApiKey } = require("../../utils")
const { FunWallet } = require("../../wallet")

const testToken = "usdc"

describe("Transfer", function () {
    this.timeout(90_000)
    let auth
    let wallet
    var REMOTE_TEST = process.env.REMOTE_TEST;
    const FORK_CHAIN_ID = REMOTE_TEST === 'true' ? FUN_TESTNET_CHAIN_ID : LOCAL_FORK_CHAIN_ID

    const amount = 1
    before(async function () {
        const apiKey = await getTestApiKey()
        const options = {
            chain: FORK_CHAIN_ID,
            apiKey: apiKey,
            gasSponsor: ""
        }
        await configureEnvironment(options)
        auth = new Eoa({ privateKey: TEST_PRIVATE_KEY })
        uniqueID = await auth.getUniqueId()
        wallet = new FunWallet({ uniqueID, index: 253840 })
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