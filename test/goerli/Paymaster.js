const { expect, assert } = require("chai")
const { Wallet } = require("ethers")
const { randomBytes } = require("ethers/lib/utils")
const { Eoa } = require("../../auth")
const { Token } = require("../../data")
const { configureEnvironment } = require("../../managers")
const { TokenSponsor } = require("../../sponsors")
const { prefundWallet, GOERLI_FUNDER_PRIVATE_KEY, GOERLI_PRIVATE_KEY } = require("../../utils")
const { FunWallet } = require("../../wallet")

const options = {
    chain: 5,
    apiKey: "localtest",
}

const paymasterToken = "dai"

describe("Paymaster", function () {
    this.timeout(600_000)
    let auth = new Eoa({ privateKey: GOERLI_PRIVATE_KEY })
    let funder = new Eoa({ privateKey: GOERLI_FUNDER_PRIVATE_KEY })
    const amount = 1
    let wallet
    let wallet1
    before(async function () {
        await configureEnvironment(options)

        salt = await auth.getUniqueId()
        wallet = new FunWallet({ salt, index: 3543 })
        wallet1 = new FunWallet({ salt, index: 23420 })

        const walletAddress = await wallet.getAddress()
        const walletAddress1 = await wallet1.getAddress()
        const funderAddress = await funder.getUniqueId()

        // await prefundWallet(auth, wallet, .1)
        const tokenBalanceBefore = (await Token.getBalance(paymasterToken, funderAddress))
        if (tokenBalanceBefore < 2000) {
            await wallet.swap(auth, {
                in: "eth",
                amount: .01,
                out: paymasterToken,
                options: {
                    returnAddress: funderAddress
                }
            })
            const tokenBalanceAfter = (await Token.getBalance(paymasterToken, funderAddress))
            assert(tokenBalanceAfter > tokenBalanceBefore, "Swap did not execute")
        }


        await configureEnvironment({
            gasSponsor: {
                sponsorAddress: funderAddress,
                token: paymasterToken
            }
        })
        const gasSponsor = new TokenSponsor()


        const ethstakeAmount = .01
        const usdcStakeAmount = 20
        const depositInfoS = await gasSponsor.getDepositInfo(walletAddress)
        const depositInfo1S = await gasSponsor.getDepositInfo(funderAddress)


        const approve = await gasSponsor.approve(usdcStakeAmount * 2)
        const deposit = await gasSponsor.stakeToken(walletAddress, usdcStakeAmount)
        const deposit1 = await gasSponsor.stakeToken(walletAddress1, usdcStakeAmount)
        const data = await gasSponsor.stake(funderAddress, ethstakeAmount)

        await funder.sendTx(approve)
        await funder.sendTx(deposit)
        await funder.sendTx(deposit1)
        await funder.sendTx(data)

        const depositInfoE = await gasSponsor.getDepositInfo(walletAddress)
        const depositInfo1E = await gasSponsor.getDepositInfo(funderAddress)

        assert(depositInfo1E.sponsorAmount.gt(depositInfo1S.sponsorAmount), "Eth Stake Failed")
        assert(depositInfoE.tokenAmount.gt(depositInfoS.tokenAmount), "Token Stake Failed")

    })

    const runSwap = async (wallet, testToken = "dai") => {
        const walletAddress = await wallet.getAddress()
        const tokenBalanceBefore = (await Token.getBalance(testToken, walletAddress))
        await wallet.swap(auth, {
            in: "eth",
            amount: .01,
            out: testToken
        })
        const tokenBalanceAfter = (await Token.getBalance(testToken, walletAddress))
        assert(tokenBalanceAfter > tokenBalanceBefore, "Swap did not execute")
    }

    it("Blacklist Mode Approved", async () => {
        const gasSponsor = new TokenSponsor()
        await funder.sendTx(await gasSponsor.setBlacklistMode())
        await runSwap(wallet)
    })

    it("Only User Whitelisted", async () => {
        const walletAddress1 = await wallet1.getAddress()
        const gasSponsor = new TokenSponsor()
        await funder.sendTx(await gasSponsor.setWhitelistMode())
        await funder.sendTx(await gasSponsor.removeWalletFromWhitelist(walletAddress1))

        try {
            await runSwap(wallet1)
            throw new Error("Wallet is not whitelisted but transaction passed")
        } catch (e) {

        }
    })


})