const { assert } = require("chai")
const { Eoa } = require("../../auth")
const { Token } = require("../../data")
const { configureEnvironment } = require("../../managers")
const { TokenSponsor } = require("../../sponsors")
const { WALLET_PRIVATE_KEY, prefundWallet, FUNDER_PRIVATE_KEY, LOCAL_FORK_CHAIN_ID, FUN_TESTNET_CHAIN_ID, getTestApiKey } = require("../../utils")
const { FunWallet } = require("../../wallet")
const PRIVATEKEY2="0x8996148bbbf98e0adf5ce681114fd32288df7dcb97829348cb2a99a600a92c38"


const testTokens = ["usdc", "dai"]
const paymasterToken = "usdc"
const timeout = (ms) => {
    return new Promise(resolve => { setTimeout(resolve, ms) })
}
describe("TokenSponsor", function () {
    this.timeout(300_000)
    let auth = new Eoa({ privateKey: "0x8996148bbbf98e0adf5ce681114fd32288df7dcb97829348cb2a99a600a92c38" })
    let funder = new Eoa({ privateKey: WALLET_PRIVATE_KEY })

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

        uniqueID = await auth.getUniqueId()
        wallet = new FunWallet({ uniqueID, index: 12142 })
        // await prefundWallet(funder, wallet, 1)
        const walletAddress = await wallet.getAddress()
        console.log(walletAddress)
        wallet1 = new FunWallet({ uniqueID, index: 235231 })

        // await prefundWallet(auth, wallet1, 1)
        const walletAddress1 = await wallet1.getAddress()
        const funderAddress = await funder.getUniqueId()
        console.log(walletAddress1)

        await wallet.swap(auth, {
            in: "eth",
            amount: .01,
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


        const ethstakeAmount = 1
        const usdcStakeAmount = 100

        const depositInfoS = await gasSponsor.getTokenBalance(paymasterToken, walletAddress)
        const depositInfo1S = await gasSponsor.getTokenBalance("eth", funderAddress)
        console.log('sdfjkj')

        const approve = await gasSponsor.approve(paymasterToken, usdcStakeAmount * 2)
        const deposit = await gasSponsor.stakeToken(paymasterToken, walletAddress, usdcStakeAmount)
        const deposit1 = await gasSponsor.stakeToken(paymasterToken, walletAddress1, usdcStakeAmount)
        const data = await gasSponsor.stake(funderAddress, ethstakeAmount)
        const addTokens = await gasSponsor.addWhitelistTokens([paymasterToken])
        console.log('sdfjkj')

        await funder.sendTxs([approve, deposit, deposit1, data, addTokens])
        console.log('sdfjkj')

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