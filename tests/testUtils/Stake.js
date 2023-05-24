const StakeTest = (config) => {
    const { chainId, authPrivateKey, outToken, baseToken, prefund } = config
    const { assert } = require("chai")
    const { Wallet } = require("ethers")
    const { Eoa } = require("../../auth")
    const { Token } = require("../../data")
    const { configureEnvironment } = require("../../managers")
    const { fundWallet, getTestApiKey } = require("../../utils")
    const { FunWallet } = require("../../wallet")

    describe("Stake", function () {
        this.timeout(120_000)
        let auth
        let wallet
        const amount = .001
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
            if (prefund)
                await fundWallet(auth, wallet, .002)
        })

        it("wallet should have lower balance of gas token", async () => {
            const walletAddress = await wallet.getAddress()
            const balBefore = (await Token.getBalance(baseToken, walletAddress))
            const res = await wallet.stake(auth, { amount })
            const balAfter = (await Token.getBalance(baseToken, walletAddress))
            assert(balAfter < balBefore, "unable to stake")
        })

    })
}
module.exports = { StakeTest }