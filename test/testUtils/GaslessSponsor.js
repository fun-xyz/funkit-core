const GaslessSponsorTest = (config) => {
    const { assert } = require("chai")
    const { Eoa } = require("../../auth")
    const { Token } = require("../../data")
    const { configureEnvironment } = require("../../managers")
    const { GaslessSponsor } = require("../../sponsors")
    const { fundWallet, getTestApiKey } = require("../../utils")
    const { FunWallet } = require("../../wallet")

    describe("GaslessSponsor", function () {
        this.timeout(180_000)
        let auth = new Eoa({ privateKey: config.authPrivateKey })
        let funder = new Eoa({ privateKey: config.funderPrivateKey })

        const amount = 1
        let wallet
        let wallet1
        before(async function () {
            const apiKey = await getTestApiKey()
            const options = {
                chain: config.chainId,
                apiKey: apiKey,
            }
            await configureEnvironment(options)

            uid = await auth.getUniqueId()
            wallet = new FunWallet({ uid, index: 0 })
            wallet1 = new FunWallet({ uid, index: 1 })

            if (config.prefund) {
                await fundWallet(funder, wallet, .5)
                await fundWallet(auth, wallet1, .5)
            }
            const funderAddress = await funder.getUniqueId()
            await wallet.swap(auth, {
                in: config.inToken,
                amount: .01,
                out: config.outToken,
                options: {
                    returnAddress: funderAddress
                }
            })

            await configureEnvironment({
                gasSponsor: {
                    sponsorAddress: await funder.getUniqueId(),
                }
            })
            const gasSponsor = new GaslessSponsor()

            const stakeAmount = config.stakeAmount
            const depositInfo1S = await gasSponsor.getBalance(funderAddress)
            const stake = await gasSponsor.stake(funderAddress, stakeAmount)
            await funder.sendTxs([stake])
            const depositInfo1E = await gasSponsor.getBalance(funderAddress)
            assert(depositInfo1E.gt(depositInfo1S), "Stake Failed")

        })

        const runSwap = async (wallet) => {
            const walletAddress = await wallet.getAddress()
            const tokenBalanceBefore = (await Token.getBalance(config.outToken, walletAddress))
            if (tokenBalanceBefore < .1) {
                await wallet.swap(auth, {
                    in: config.inToken,
                    amount: .1,
                    out: config.outToken
                })
                const tokenBalanceAfter = (await Token.getBalance(config.outToken, walletAddress))
                assert(tokenBalanceAfter > tokenBalanceBefore, "Swap did not execute")
            }
        }

        it("Blacklist Mode Approved", async () => {
            const gasSponsor = new GaslessSponsor()
            await funder.sendTx(await gasSponsor.setToBlacklistMode())
            await runSwap(wallet)
        })

        it("Only User Whitelisted", async () => {
            const walletAddress = await wallet.getAddress()
            const walletAddress1 = await wallet1.getAddress()

            const gasSponsor = new GaslessSponsor()
            await funder.sendTx(await gasSponsor.setToWhitelistMode())
            await funder.sendTx(await gasSponsor.addSpenderToWhiteList(walletAddress))
            await funder.sendTx(await gasSponsor.removeSpenderFromWhiteList(walletAddress1))
            await runSwap(wallet)

            try {
                await runSwap(wallet1)
                throw new Error("Wallet is not whitelisted but transaction passed")
            } catch (e) {
                assert(e.message.includes("AA33"), "Error but not AA33")
            }
        })
    })
}
module.exports = { GaslessSponsorTest }
