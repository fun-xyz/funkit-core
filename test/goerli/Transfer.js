const { expect, assert } = require("chai")
const { Wallet } = require("ethers")
const { randomBytes } = require("ethers/lib/utils")
const { Eoa } = require("../../auth")
const { Token } = require("../../data")
const { configureEnvironment } = require("../../managers")
const { prefundWallet } = require("../../utils")
const { TEST_PRIVATE_KEY, GOERLI_PRIVATE_KEY } = require("../testUtils")
const { FunWallet } = require("../../wallet")

const options = {
    chain: 5,
    apiKey: "localtest",
    gasSponsor: ""

}
const testToken = "dai"

describe("Transfer", function () {
    this.timeout(90_000)
    let auth
    let wallet
    const amount = 1
    before(async function () {
        await configureEnvironment(options)
        auth = new Eoa({ privateKey: GOERLI_PRIVATE_KEY })
        uniqueID = await auth.getUniqueId()
        wallet = new FunWallet({ uniqueID, index: 23421 })
        // await prefundWallet(auth, wallet, .3)

    })

    it("wallet should have lower balance of specified token", async () => {
        var wallet1 = Wallet.createRandom();
        const randomAddress = wallet1.address
        const walletAddress = await wallet.getAddress()

        let b1 = Token.getBalance(testToken, randomAddress)
        let b2 = Token.getBalance(testToken, walletAddress)
        const receipt = await wallet.transfer(auth, { to: randomAddress, amount, token: testToken })
        let b3 = Token.getBalance(testToken, randomAddress)
        let b4 = Token.getBalance(testToken, walletAddress)

        let [randomTokenBalanceBefore, walletTokenBalanceBefore, randomTokenBalanceAfter, walletTokenBalanceAfter] = await Promise.all([b1, b2, b3, b4])
        assert(randomTokenBalanceAfter - randomTokenBalanceBefore == amount, "Transfer failed")
        assert(walletTokenBalanceBefore - walletTokenBalanceAfter == amount, "Transfer failed")

    })

})