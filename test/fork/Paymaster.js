const { assert } = require("chai")
const { Eoa } = require("../../auth")
const { Token } = require("../../data")
const { configureEnvironment } = require("../../managers")
const { TokenSponsor } = require("../../sponsors")
const { TEST_PRIVATE_KEY, prefundWallet, FUNDER_PRIVATE_KEY, LOCAL_FORK_CHAIN_ID, FUN_TESTNET_CHAIN_ID, TEST_API_KEY } = require("../../utils")
const { FunWallet } = require("../../wallet")


const testTokens = ["usdc", "dai"]
const paymasterToken = "usdc"
const timeout = (ms) => {
    return new Promise(resolve => { setTimeout(resolve, ms) })
}
describe("Paymaster", function () {
    this.timeout(30_000)
    let auth = new Eoa({ privateKey: TEST_PRIVATE_KEY })
    let funder = new Eoa({ privateKey: FUNDER_PRIVATE_KEY })

    
    var REMOTE_TEST = process.env.REMOTE_TEST;
    const FORK_CHAIN_ID = REMOTE_TEST === 'true' ? FUN_TESTNET_CHAIN_ID : LOCAL_FORK_CHAIN_ID
    const options = {
        chain: FORK_CHAIN_ID,
        apiKey: TEST_API_KEY,
    }

    const amount = 1
    let wallet
    let wallet1
    before(async function () {
        await configureEnvironment(options)

        salt = await auth.getUniqueId()
        wallet = new FunWallet({ salt, index: 0 })
        await prefundWallet(funder, wallet, 3)
        const walletAddress = await wallet.getAddress()

        wallet1 = new FunWallet({ salt, index: 1 })

        await prefundWallet(auth, wallet1, 3)
        const walletAddress1 = await wallet1.getAddress()

        const funderAddress = await funder.getUniqueId()
        await wallet.swap(auth, {
            in: "eth",
            amount: 1,
            out: "usdc",
            options: {
                returnAddress: funderAddress
            }
        })

        await configureEnvironment({
            gasSponsor: {
                sponsorAddress: funderAddress,
                token: paymasterToken
            }
        })

        const gasSponsor = new TokenSponsor()


        const ethstakeAmount = 1
        const usdcStakeAmount = 100

        const depositInfoS = await gasSponsor.getTokenBalance(paymasterToken, walletAddress)
        const depositInfo1S = await gasSponsor.getTokenBalance("eth", funderAddress)


        const approve = await gasSponsor.approve(paymasterToken, usdcStakeAmount * 2)
        const deposit = await gasSponsor.stakeToken(paymasterToken, walletAddress, usdcStakeAmount)
        const deposit1 = await gasSponsor.stakeToken(paymasterToken, walletAddress1, usdcStakeAmount)
        const data = await gasSponsor.stake(funderAddress, ethstakeAmount)

        await funder.sendTxs([approve, deposit, deposit1, data])

        const depositInfoE = await gasSponsor.getTokenBalance(paymasterToken, walletAddress)
        const depositInfo1E = await gasSponsor.getTokenBalance("eth", funderAddress)

        assert(depositInfo1E.gt(depositInfo1S), "Eth Stake Failed")
        assert(depositInfoE.gt(depositInfoS), "Token Stake Failed")

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
        const gasSponsor = new TokenSponsor()
        await funder.sendTx(await gasSponsor.setGlobalToBlacklistMode())
        await runSwap(wallet)
    })

    it("Only User Whitelisted", async () => {
        const walletAddress = await wallet.getAddress()
        const walletAddress1 = await wallet1.getAddress()

        const gasSponsor = new TokenSponsor()
        await funder.sendTx(await gasSponsor.setGlobalToWhitelistMode())
        await funder.sendTx(await gasSponsor.addSpenderToGlobalWhiteList(walletAddress))
        await funder.sendTx(await gasSponsor.removeSpenderFromGlobalWhiteList(walletAddress1))
        await runSwap(wallet)
        try {
            await runSwap(wallet1)
            throw new Error("Wallet is not whitelisted but transaction passed")
        } catch (e) {
            assert(e.message.includes("AA33"), "Error but not AA33")
        }
    })


})