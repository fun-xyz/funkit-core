const { expect, assert } = require("chai")
const { Wallet } = require("ethers")
const { randomBytes } = require("ethers/lib/utils")
const { Eoa } = require("../../auth")
const { Token } = require("../../data")
const { configureEnvironment } = require("../../managers")
const { TokenSponsor } = require("../../sponsors")
const { TEST_PRIVATE_KEY, prefundWallet, FUNDER_PRIVATE_KEY } = require("../../utils")
const { FunWallet } = require("../../wallet")

const options = {
    chain: 31337,
    apiKey: "localtest",
}
const testTokens = ["usdc", "dai"]
const timeout = (ms) => {
    return new Promise(resolve => { setTimeout(resolve, ms) })
}
describe("Paymaster", function () {
    this.timeout(30_000)
    let auth = new Eoa({ privateKey: TEST_PRIVATE_KEY })
    let funder = new Eoa({ privateKey: FUNDER_PRIVATE_KEY })
    const amount = 1
    let wallet
    let wallet1
    before(async function () {
        await configureEnvironment(options)

        salt = await auth.getUniqueId()
        wallet = new FunWallet({ salt, index: 0 })

        await prefundWallet(auth, wallet, 1)
        const walletAddress = await wallet.getAddress()
        
        wallet1 = new FunWallet({ salt, index: 1 })
        
        await prefundWallet(auth, wallet1, 1)
        const walletAddress1 = await wallet1.getAddress()
        
        const funderAddress = await funder.getUniqueId()
        
        await wallet.swap(auth, {
            in: "eth",
            amount: 10,
            out: "usdc",
            options: {
                returnAddress: funderAddress
            }
        })
        
        
        console.log('here')
        await configureEnvironment({
            gasSponsor: {
                sponsorAddress: funderAddress,
                token: "usdc"
            }
        })
        const gasSponsor = new TokenSponsor()
        await funder.sendTx(await gasSponsor.setBlacklistMode())
        
        const ethstakeAmount = 10
        const usdcStakeAmount = 100
        const depositInfoS = await gasSponsor.getDepositInfo(walletAddress)
        const depositInfo1S = await gasSponsor.getDepositInfo(funderAddress)

        const approve = await gasSponsor.approve(usdcStakeAmount * 2)
        const deposit = await gasSponsor.stakeToken(walletAddress, usdcStakeAmount)
        const deposit1 = await gasSponsor.stakeToken(walletAddress1, usdcStakeAmount)
        const data = await gasSponsor.stake(funderAddress, ethstakeAmount)

        await funder.sendTxs([approve, deposit, deposit1, data])

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
            amount: .1,
            out: "dai"
        })
        const tokenBalanceAfter = (await Token.getBalance(testToken, walletAddress))
        assert(tokenBalanceAfter > tokenBalanceBefore, "Swap did not execute")
    }

    it("Blacklist Mode Approved", async () => {
        const gasSponsor = new TokenSponsor()
        await runSwap(wallet)
    })

    it("Only User Whitelisted", async () => {
        const walletAddress = await wallet.getAddress()
        const walletAddress1 = await wallet1.getAddress()
        const gasSponsor = new TokenSponsor()
        await funder.sendTx(await gasSponsor.setWhitelistMode())
        await funder.sendTx(await gasSponsor.addWalletToWhitelist(walletAddress))
        await funder.sendTx(await gasSponsor.removeWalletFromWhitelist(walletAddress1))
        await runSwap(wallet)
        try {
            await runSwap(wallet1)
            throw new Error("Wallet is not whitelisted but transaction passed")
        } catch (e) {
            assert(e.message.includes("properties of undefine"), "Error but not AA33")
        }
    })


})