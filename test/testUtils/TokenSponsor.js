const TokenSponsorTest = (config) => {
    const { assert } = require("chai")
    const { Eoa } = require("../../auth")
    const { Token } = require("../../data")
    const { configureEnvironment } = require("../../managers")
    const { TokenSponsor } = require("../../sponsors")
    const { fundWallet, getTestApiKey } = require("../../utils")
    const { FunWallet } = require("../../wallet")

    const paymasterToken = config.paymasterToken

    describe("TokenSponsor", function () {
        this.timeout(200_000)
        let auth = new Eoa({ privateKey: config.authPrivateKey })
        let funder = new Eoa({ privateKey: config.funderPrivateKey })
        let wallet
        let wallet1
        before(async function () {
            const apiKey = await getTestApiKey()
            const options = {
                chain: config.chainId,
                apiKey: apiKey,
            }

            await configureEnvironment(options)
            
            uniqueId = await auth.getUniqueId()

            wallet = new FunWallet({ uniqueId, index: 12142 })
            wallet1 = new FunWallet({ uniqueId, index: 235231 })

            const walletAddress = await wallet.getAddress()
            const walletAddress1 = await wallet1.getAddress()

            const funderAddress = await funder.getUniqueId()

            if (config.prefund) {
                await fundWallet(funder, wallet, .5)
                await fundWallet(auth, wallet1, .5)
            }

            await wallet.swap(auth, {
                in: config.inToken,
                amount: config.swapAmount,
                out: paymasterToken,
                options: {
                    returnAddress: funderAddress
                }
            })

            await configureEnvironment({
                gasSponsor: {
                    sponsorAddress: funderAddress,
                    token: paymasterToken,
                }
            })

            const gasSponsor = new TokenSponsor()

            const baseStakeAmount = config.baseTokenStakeAmt
            const paymasterTokenStakeAmount = config.paymasterTokenStakeAmt

            const depositInfoS = await gasSponsor.getTokenBalance(paymasterToken, walletAddress)
            const depositInfo1S = await gasSponsor.getTokenBalance("eth", funderAddress)

            const approve = await gasSponsor.approve(paymasterToken, paymasterTokenStakeAmount * 2)
            const deposit = await gasSponsor.stakeToken(paymasterToken, walletAddress, paymasterTokenStakeAmount)
            const deposit1 = await gasSponsor.stakeToken(paymasterToken, walletAddress1, paymasterTokenStakeAmount)
            const data = await gasSponsor.stake(funderAddress, baseStakeAmount)
            const addTokens = await gasSponsor.addWhitelistTokens([paymasterToken])

            await funder.sendTxs([approve, deposit, deposit1, data, addTokens])

            const depositInfoE = await gasSponsor.getTokenBalance(paymasterToken, walletAddress)
            const depositInfo1E = await gasSponsor.getTokenBalance("eth", funderAddress)

            assert(depositInfo1E.gt(depositInfo1S), "Base Stake Failed")
            assert(depositInfoE.gt(depositInfoS), "Token Stake Failed")

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
            const gasSponsor = new TokenSponsor()
            await funder.sendTx(await gasSponsor.setToBlacklistMode())
            await runSwap(wallet)
        })

        it("Only User Whitelisted", async () => {
            const walletAddress = await wallet.getAddress()
            const walletAddress1 = await wallet1.getAddress()
            const gasSponsor = new TokenSponsor()
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

module.exports = { TokenSponsorTest }