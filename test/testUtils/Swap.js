const SwapTest = (chainId, authPrivateKey, inToken, outToken, prefund = true, apiKey="localtest" ) => {
    const { assert } = require("chai")
    const { Eoa } = require("../../auth")
    const { Token } = require("../../data")
    const { configureEnvironment } = require("../../managers")
    const { FunWallet } = require("../../wallet")
    const { prefundWallet } = require("../../utils")

    const options = {
        chain: chainId,
        apiKey: apiKey,
        gasSponsor: "",
    }
    
    describe("Swap", function () {
        this.timeout(60_000)
        let auth
        let wallet
        before(async function () {
            await configureEnvironment(options)
            auth = new Eoa({ privateKey: authPrivateKey })
            salt = await auth.getUniqueId()
            wallet = new FunWallet({ salt, index: 23420 })
            if(prefund) {
                await prefundWallet(auth, wallet, .3)
            }
        })

        it("ETH => ERC20", async () => {
            const walletAddress = await wallet.getAddress()
            const tokenBalanceBefore = (await Token.getBalance(inToken, walletAddress))
            const res= await wallet.swap(auth, {
                in: "eth",
                amount: .01,
                out: inToken
            })
            const tokenBalanceAfter = (await Token.getBalance(inToken, walletAddress))
            assert(tokenBalanceAfter > tokenBalanceBefore, "Swap did not execute")
        })

        it("ERC20 => ERC20", async () => {
            const walletAddress = await wallet.getAddress()
            const tokenBalanceBefore = (await Token.getBalance(inToken, walletAddress))
            const res = await wallet.swap(auth, {
                in: inToken,
                amount: .00001,
                out: outToken
            })
            const tokenBalanceAfter = (await Token.getBalance(inToken, walletAddress))
            assert(tokenBalanceAfter < tokenBalanceBefore, "Swap did not execute")
        })

    })
}

module.exports = { SwapTest }