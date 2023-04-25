const { assert } = require("chai")
const { Eoa } = require("../../auth")
const { Token } = require("../../data")
const { configureEnvironment } = require("../../managers")
const { GaslessSponsor } = require("../../sponsors")
const { WALLET_PRIVATE_KEY, prefundWallet, FUNDER_PRIVATE_KEY, LOCAL_FORK_CHAIN_ID, FUN_TESTNET_CHAIN_ID, getTestApiKey } = require("../../utils")
const { FunWallet } = require("../../wallet")
const PRIVATEKEY2="0x8996148bbbf98e0adf5ce681114fd32288df7dcb97829348cb2a99a600a92c38"

const testTokens = ["usdc", "dai"]
const paymasterToken = "usdc"
const timeout = (ms) => {
    return new Promise(resolve => { setTimeout(resolve, ms) })
}

describe("GaslessSponsor", function () {
    this.timeout(150_000)
    let auth = new Eoa({ privateKey: WALLET_PRIVATE_KEY })
    let funder = new Eoa({ privateKey: PRIVATEKEY2 })

    const amount = 1
    let wallet
    let wallet1
    before(async function () {
        const apiKey = await getTestApiKey()
        const options = {
            chain: 5,
            apiKey: apiKey,
        }
        await configureEnvironment(options)

        uid = await auth.getUniqueId()
        wallet = new FunWallet({ uid, index: 0 })
        // await prefundWallet(funder, wallet, .5)
        const walletAddress = await wallet.getAddress()

        wallet1 = new FunWallet({ uid, index: 1 })

        // await prefundWallet(auth, wallet1, .5)
        const walletAddress1 = await wallet1.getAddress()
        const funderAddress = await funder.getUniqueId()
        await wallet.swap(auth, {
            in: "eth",
            amount: .01,
            out: "usdc",
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

        const ethstakeAmount = 1
        const depositInfo1S = await gasSponsor.getBalance(funderAddress)
        const stake = await gasSponsor.stake(funderAddress, ethstakeAmount)
        await funder.sendTxs([stake])
        const depositInfo1E = await gasSponsor.getBalance(funderAddress)
        assert(depositInfo1E.gt(depositInfo1S), "Eth Stake Failed")
        
    })

    const runSwap = async (wallet, testToken = "dai") => {
        const walletAddress = await wallet.getAddress()
        const tokenBalanceBefore = (await Token.getBalance(testToken, walletAddress))
        if (tokenBalanceBefore < .1) {
            await wallet.swap(auth, {
                in: "eth",
                amount: .1,
                out: testToken
            })
            const tokenBalanceAfter = (await Token.getBalance(testToken, walletAddress))
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