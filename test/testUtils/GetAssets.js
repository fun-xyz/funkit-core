const { getTestApiKey } = require("../testUtils")
const GetAssetsTest = (config) => {
    const { chainId, authPrivateKey, inToken, outToken, baseToken, prefund } = config
    const { assert } = require("chai")
    const { Eoa } = require("../../auth")
    const { Token } = require("../../data")
    const { configureEnvironment } = require("../../managers")
    const { FunWallet } = require("../../wallet")
    const { fundWallet, getTestApiKey } = require("../../utils")

    describe("Get Assets", function () {
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
            uniqueId = await auth.getUniqueId()
            wallet = new FunWallet({ uniqueId, index: 14142 })
            if (prefund) {
                await fundWallet(auth, wallet, .5)
            }
        })

        it("getAssets", async () => {
            const res = await wallet.getTokens(1, "0xf584F8728B874a6a5c7A8d4d387C9aae9172D621")
            console.log(res)
        })

    })
}

module.exports = { GetAssetsTest }