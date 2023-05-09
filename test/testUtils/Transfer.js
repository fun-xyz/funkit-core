const { getTestApiKey } = require("../testUtils")
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
        const amount = .01
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
            wallet = new FunWallet({ uniqueId, index: 1792811340 })
            console.log(await wallet.getAddress())
            if (prefund)
                await fundWallet(auth, wallet, .7)
            const walletAddress = await wallet.getAddress()
            const tokenBalanceBefore = (await Token.getBalance(outToken, walletAddress))
            if (tokenBalanceBefore < amount) {
                await wallet.swap(auth, {
                    in: baseToken,
                    amount: .1,
                    out: outToken
                })
                const tokenBalanceAfter = (await Token.getBalance(outToken, walletAddress))
                assert(tokenBalanceAfter > tokenBalanceBefore, "Swap did not execute")
            }

        })

        it("wallet should have lower balance of specified token", async () => {
            var wallet1 = Wallet.createRandom();
            const randomAddress = wallet1.address
            const walletAddress = await wallet.getAddress()

            let b1 = Token.getBalance(outToken, randomAddress)
            let b2 = Token.getBalance(outToken, walletAddress)
            const receipt = await wallet.transfer(auth, { to: randomAddress, amount, token: outToken })
            let b3 = Token.getBalance(outToken, randomAddress)
            let b4 = Token.getBalance(outToken, walletAddress)

            let [randomTokenBalanceBefore, walletTokenBalanceBefore, randomTokenBalanceAfter, walletTokenBalanceAfter] = await Promise.all([b1, b2, b3, b4])

            assert(randomTokenBalanceAfter > randomTokenBalanceBefore, "Transfer failed")
            assert(walletTokenBalanceBefore > walletTokenBalanceAfter, "Transfer failed")

        })

    })
}
module.exports = { TransferTest }