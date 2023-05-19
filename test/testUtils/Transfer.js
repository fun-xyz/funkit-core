const TransferTest = (config) => {
    const { chainId, authPrivateKey, outToken, baseToken, prefund } = config
    const { assert } = require("chai")
    const { Wallet } = require("ethers")
    const { Eoa } = require("../../auth")
    const { Token } = require("../../data")
    const { configureEnvironment } = require("../../managers")
    const { fundWallet, getTestApiKey } = require("../../utils")
    const { FunWallet } = require("../../wallet")

    describe("Transfer", function () {
        this.timeout(120_000)
        let auth
        let wallet
        let difference
        before(async function () {
            let apiKey = await getTestApiKey()
            const options = {
                chain: chainId,
                apiKey: apiKey,
                gasSponsor: null
            }
            await configureEnvironment(options)
            auth = new Eoa({ privateKey: authPrivateKey })
            uniqueId = await auth.getUniqueId()
            wallet = new FunWallet({ uniqueId, index: config.index != null ? config.index : 1792811340 })

            if (prefund)
                await fundWallet(auth, wallet, .7)
            const walletAddress = await wallet.getAddress()
            const tokenBalanceBefore = (await Token.getBalance(outToken, walletAddress))
            const receipt = await wallet.swap(auth, {
                in: baseToken,
                amount: config.amount ? config.amount : .01,
                out: outToken
            })
            const tokenBalanceAfter = (await Token.getBalance(outToken, walletAddress))
            difference = tokenBalanceAfter - tokenBalanceBefore
            assert(tokenBalanceAfter > tokenBalanceBefore, "Swap did not execute")


        })
        it("transfer baseToken directly", async () => {
            var wallet1 = Wallet.createRandom();
            const randomAddress = wallet1.address
            const walletAddress = await wallet.getAddress()

            let b1 = Token.getBalance(baseToken, randomAddress)
            let b2 = Token.getBalance(baseToken, walletAddress)
            const receipt = await wallet.transfer(auth, { to: randomAddress, amount: config.amount ? config.amount : .01, token: baseToken })
            let b3 = Token.getBalance(baseToken, randomAddress)
            let b4 = Token.getBalance(baseToken, walletAddress)

            let [randomTokenBalanceBefore, walletTokenBalanceBefore, randomTokenBalanceAfter, walletTokenBalanceAfter] = await Promise.all([b1, b2, b3, b4])

            assert(randomTokenBalanceAfter > randomTokenBalanceBefore, "Transfer failed")
            assert(walletTokenBalanceBefore > walletTokenBalanceAfter, "Transfer failed")

        })
        it("wallet should have lower balance of specified token", async () => {
            var wallet1 = Wallet.createRandom();
            const randomAddress = wallet1.address
            const walletAddress = await wallet.getAddress()

            let b1 = Token.getBalance(outToken, randomAddress)
            let b2 = Token.getBalance(outToken, walletAddress)
            const receipt = await wallet.transfer(auth, { to: randomAddress, amount: difference / 2, token: outToken })
            let b3 = Token.getBalance(outToken, randomAddress)
            let b4 = Token.getBalance(outToken, walletAddress)

            let [randomTokenBalanceBefore, walletTokenBalanceBefore, randomTokenBalanceAfter, walletTokenBalanceAfter] = await Promise.all([b1, b2, b3, b4])

            assert(randomTokenBalanceAfter > randomTokenBalanceBefore, "Transfer failed")
            assert(walletTokenBalanceBefore > walletTokenBalanceAfter, "Transfer failed")

        })

    })
}
module.exports = { TransferTest }