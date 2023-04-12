const SwapTest = (chainId, authPrivateKey, outToken, prefund = true, apiKey="localtest" ) => {
    const { assert } = require("chai")
    const { Eoa } = require("../../auth")
    const { Token } = require("../../data")
    const { configureEnvironment } = require("../../managers")
    const { FunWallet } = require("../../wallet")
    const { prefundWallet } = require("../../utils")

    const options = {
        chain: chainId,
        apiKey: apiKey,
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
            auth = new Eoa({ privateKey: authPrivateKey })
            salt = await auth.getUniqueId()
            wallet = new FunWallet({ salt, index: 236725 })
            if(prefund) await prefundWallet(auth, wallet, .3)
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
            const tokenBalanceBefore = (await Token.getBalance(testToken, walletAddress))
            await wallet.swap(auth, {
                in: testToken,
                amount: 1,
                out: outToken
            })
            const tokenBalanceAfter = (await Token.getBalance(testToken, walletAddress))
            assert(tokenBalanceAfter < tokenBalanceBefore, "Swap did not execute")

        })

    })
}

module.exports = { SwapTest }