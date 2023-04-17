const { expect, assert } = require("chai")
const { Eoa } = require("../../auth")
const { Token } = require("../../data")
const { configureEnvironment } = require("../../managers")
const { TokenSponsor } = require("../../sponsors")
const { prefundWallet, GOERLI_FUNDER_PRIVATE_KEY, GOERLI_PRIVATE_KEY, TEST_API_KEY} = require("../../utils")
const { FunWallet } = require("../../wallet")

const options = {
    chain: 5,
    apiKey: TEST_API_KEY,
}

const paymasterToken = "0x855af47cdf980a650ade1ad47c78ec1deebe9093"

describe("Paymaster", function () {
    this.timeout(600_000)
    let auth = new Eoa({ privateKey: GOERLI_PRIVATE_KEY })
    let funder = new Eoa({ privateKey: GOERLI_FUNDER_PRIVATE_KEY })
    const amount = 1
    let wallet
    let wallet1
    before(async function () {
        await configureEnvironment(options)
        uid = await auth.getuniqueID()
        wallet = new FunWallet({ uid, index: 354331 })
        wallet1 = new FunWallet({ uid, index: 2342031 })

        const walletAddress = await wallet.getAddress()
        const walletAddress1 = await wallet1.getAddress()
        const funderAddress = await funder.getuniqueID()
        console.log(funderAddress)

        // await prefundWallet(auth, wallet, .5)
        const tokenBalanceBefore = (await Token.getBalance(paymasterToken, funderAddress))


        await configureEnvironment({
            gasSponsor: {
                sponsorAddress: funderAddress,
                token: paymasterToken
            }
        })
        const gasSponsor = new TokenSponsor()


        const ethstakeAmount = .05
        const tokenStakeAmt = 10

        const depositInfoS = await gasSponsor.getTokenBalance(paymasterToken, walletAddress)
        const depositInfo1S = await gasSponsor.getTokenBalance("eth", funderAddress)


        const approve = await gasSponsor.approve(paymasterToken, tokenStakeAmt * 2)
        const deposit = await gasSponsor.stakeToken(paymasterToken, walletAddress, tokenStakeAmt)
        const deposit1 = await gasSponsor.stakeToken(paymasterToken, walletAddress1, tokenStakeAmt)
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
        await funder.sendTx(await gasSponsor.setGlobalToBlacklistMode())
        await runSwap(wallet)
    })

    it("Only User Whitelisted", async () => {
        const walletAddress1 = await wallet1.getAddress()
        const gasSponsor = new TokenSponsor()
        await funder.sendTx(await gasSponsor.setGlobalToWhitelistMode())
        await funder.sendTx(await gasSponsor.removeSpenderFromGlobalWhiteList(walletAddress1))
        try {
            await runSwap(wallet1)
            throw new Error("Wallet is not whitelisted but transaction passed")
        } catch (e) {
            assert(e.message.includes("AA33"), "Error but not AA33")
        }
    })


})