const { getTestApiKey } = require("../testUtils")
const SwapTest = (config) => {
    const { chainId, authPrivateKey, inToken, outToken, baseToken, prefund } = config
    const { assert } = require("chai")
    const { Eoa } = require("../../auth")
    const { Token } = require("../../data")
    const { configureEnvironment } = require("../../managers")
    const { FunWallet } = require("../../wallet")
    const { prefundWallet, getTestApiKey } = require("../../utils")


    

    describe("Swap", function () {
        this.timeout(120_000)
        let auth
        let wallet
        before(async function () {
            let apiKey = await getTestApiKey()
            const options = {
                chain: chainId,
                apiKey: apiKey,
                gasSponsor: null,
            }
            await configureEnvironment(options)
            auth = new Eoa({ privateKey: authPrivateKey })
            uniqueID = await auth.getUniqueId()
            wallet = new FunWallet({ uniqueID, index: 234231 })
            if (prefund) {
                await prefundWallet(auth, wallet, .3)
            }
        })

        it("ETH => ERC20", async () => {
            const walletAddress = await wallet.getAddress()
            const tokenBalanceBefore = (await Token.getBalance(inToken, walletAddress))
            const res = await wallet.swap(auth, {
                in: baseToken,
                amount: .01,
                out: inToken
            })
            const tokenBalanceAfter = (await Token.getBalance(inToken, walletAddress))
            assert(tokenBalanceAfter > tokenBalanceBefore, "Swap did not execute")
        })

        it("ERC20 => ERC20", async () => {
            const walletAddress = await wallet.getAddress()
            const tokenBalanceBefore = (await Token.getBalance(outToken, walletAddress))
            const res = await wallet.swap(auth, {
                in: inToken,
                amount: .0001,
                out: outToken
            })
            const tokenBalanceAfter = (await Token.getBalance(outToken, walletAddress))
            assert(tokenBalanceAfter > tokenBalanceBefore, "Swap did not execute")
        })

    })
}

module.exports = { SwapTest }