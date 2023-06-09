import { assert, expect } from "chai"
import { Address, Hex } from "viem"
import { Eoa } from "../../src/auth"
import { GlobalEnvOption, configureEnvironment } from "../../src/config"
import { Token } from "../../src/data"
import { TokenSponsor } from "../../src/sponsors"
import { fundWallet } from "../../src/utils"
import { FunWallet } from "../../src/wallet"
import { getAwsSecret, getTestApiKey } from "../getAWSSecrets"

import "../../fetch-polyfill"

export interface TokenSponsorTestConfig {
    chainId: number
    inToken: string
    outToken: string
    paymasterToken: string
    baseTokenStakeAmt: number
    paymasterTokenStakeAmt: number
    prefund: boolean
    swapAmount: number
    stake: boolean
    walletIndex?: number
    funderIndex?: number
}

export const TokenSponsorTest = (config: TokenSponsorTestConfig) => {
    const paymasterToken = config.paymasterToken

    describe("TokenSponsor", function () {
        this.timeout(300_000)
        let auth: Eoa
        let funder: Eoa
        let wallet: FunWallet
        let wallet1: FunWallet
        let funderAddress: Address
        let walletAddress: Address
        let walletAddress1: Address
        let sponsor: TokenSponsor
        let options: GlobalEnvOption

        before(async function () {
            auth = new Eoa({ privateKey: (await getAwsSecret("PrivateKeys", "WALLET_PRIVATE_KEY_2")) as Hex })
            funder = new Eoa({ privateKey: (await getAwsSecret("PrivateKeys", "WALLET_PRIVATE_KEY")) as Hex })
            const apiKey = await getTestApiKey()
            options = {
                chain: config.chainId.toString(),
                apiKey: apiKey
            }

            await configureEnvironment(options)

            const uniqueId = await auth.getUniqueId()

            wallet = new FunWallet({ uniqueId, index: config.walletIndex ? config.walletIndex : 1223452391856341 })
            wallet1 = new FunWallet({ uniqueId, index: config.funderIndex ? config.funderIndex : 2345234 })

            walletAddress = await wallet.getAddress()
            walletAddress1 = await wallet1.getAddress()

            funderAddress = await funder.getUniqueId()

            if (config.prefund) {
                await fundWallet(funder, wallet, 0.005)
                await fundWallet(auth, wallet1, 0.005)
            }

            await wallet.swap(auth, {
                in: config.inToken,
                amount: config.swapAmount,
                out: paymasterToken,
                returnAddress: funderAddress
            })

            options.gasSponsor = {
                sponsorAddress: funderAddress,
                token: paymasterToken
            }
            await configureEnvironment(options)

            sponsor = new TokenSponsor()

            const baseStakeAmount = config.baseTokenStakeAmt
            const paymasterTokenStakeAmount = config.paymasterTokenStakeAmt

            const depositInfoS = await sponsor.getTokenBalance(paymasterToken, walletAddress)
            const depositInfo1S = await sponsor.getTokenBalance("eth", funderAddress)

            const approve = await sponsor.approve(paymasterToken, paymasterTokenStakeAmount * 2)
            const deposit = await sponsor.stakeToken(paymasterToken, walletAddress, paymasterTokenStakeAmount)
            const deposit1 = await sponsor.stakeToken(paymasterToken, walletAddress1, paymasterTokenStakeAmount)
            const data = await sponsor.stake(funderAddress, baseStakeAmount)

            await funder.sendTxs([approve, deposit, deposit1, data])

            const depositInfoE = await sponsor.getTokenBalance(paymasterToken, walletAddress)
            const depositInfo1E = await sponsor.getTokenBalance("eth", funderAddress)

            assert(depositInfo1E > depositInfo1S, "Base Stake Failed")
            assert(depositInfoE > depositInfoS, "Token Stake Failed")
        })

        const runSwap = async (wallet: FunWallet) => {
            const tokenBalanceBefore = await Token.getBalance(config.outToken, walletAddress)
            await wallet.swap(auth, {
                in: config.inToken,
                amount: config.swapAmount,
                out: config.outToken
            })

            await new Promise((f) => setTimeout(f, 2000))

            const tokenBalanceAfter = await Token.getBalance(config.outToken, walletAddress)
            assert(tokenBalanceAfter > tokenBalanceBefore, "Swap did not execute")
        }

        it("Only User Whitelisted", async () => {
            await funder.sendTx(sponsor.setToWhitelistMode())
            expect(await sponsor.getListMode(funderAddress)).to.be.false

            await funder.sendTx(sponsor.addSpenderToWhiteList(walletAddress))
            expect(await sponsor.getSpenderWhitelisted(walletAddress, funderAddress)).to.be.true

            await funder.sendTx(sponsor.removeSpenderFromWhiteList(walletAddress1))
            expect(await sponsor.getSpenderWhitelisted(walletAddress1, funderAddress)).to.be.false

            expect(await runSwap(wallet)).to.not.throw
            try {
                await runSwap(wallet1)
                throw new Error("Wallet is not whitelisted but transaction passed")
            } catch (error: any) {
                assert(error.message.includes("AA33"), "Error but not AA33\n" + error)
            }
        })

        it("Blacklist Mode Approved", async () => {
            const funder = new Eoa({ privateKey: await getAwsSecret("PrivateKeys", "WALLET_PRIVATE_KEY") })

            await funder.sendTx(await sponsor.setToBlacklistMode())
            expect(await sponsor.getListMode(funderAddress)).to.be.true

            await funder.sendTx(sponsor.addSpenderToBlackList(walletAddress1))
            expect(await sponsor.getSpenderBlacklisted(walletAddress1, funderAddress)).to.be.true

            await funder.sendTx(sponsor.removeSpenderFromBlackList(walletAddress))
            expect(await sponsor.getSpenderBlacklisted(walletAddress, funderAddress)).to.be.false

            expect(await runSwap(wallet)).not.to.throw
            try {
                await runSwap(wallet1)
                throw new Error("Wallet is not blacklisted but transaction passed")
            } catch (error: any) {
                assert(error.message.includes("AA33"), "Error but not AA33\n" + error)
            }
        })

        it("Lock/Unlock Tokens", async () => {
            await funder.sendTx(sponsor.unlockTokenDepositAfter(paymasterToken, 0))
            expect(await sponsor.getLockState(paymasterToken, funderAddress)).to.be.false
            expect(await sponsor.getLockState(config.outToken, funderAddress)).to.be.true
            expect(await sponsor.getLockState("eth", funderAddress)).to.be.true
            await funder.sendTx(sponsor.lockTokenDeposit(paymasterToken))
            expect(await sponsor.getLockState(paymasterToken, funderAddress)).to.be.true
        })

        it("Lock/Unlock Base Tokens", async () => {
            await funder.sendTx(sponsor.unlockDepositAfter(0))
            expect(await sponsor.getLockState(paymasterToken, funderAddress)).to.be.true
            expect(await sponsor.getLockState("eth", funderAddress)).to.be.false
            await funder.sendTx(sponsor.lockDeposit())
            expect(await sponsor.getLockState("eth", funderAddress)).to.be.true
        })

        it("Batch Blacklist/Whitelist Users", async () => {
            await funder.sendTx(sponsor.setToBlacklistMode())
            await funder.sendTx(sponsor.batchBlacklistUsers([walletAddress, walletAddress1], [false, false]))
            expect(await sponsor.getSpenderBlacklisted(walletAddress, funderAddress)).to.be.false
            expect(await sponsor.getSpenderBlacklisted(walletAddress1, funderAddress)).to.be.false
            await funder.sendTx(sponsor.batchBlacklistUsers([walletAddress, walletAddress1], [true, true]))
            expect(await sponsor.getSpenderBlacklisted(walletAddress, funderAddress)).to.be.true
            expect(await sponsor.getSpenderBlacklisted(walletAddress1, funderAddress)).to.be.true

            await funder.sendTx(sponsor.setToWhitelistMode())
            await funder.sendTx(sponsor.batchWhitelistUsers([walletAddress, walletAddress1], [false, false]))
            expect(await sponsor.getSpenderWhitelisted(walletAddress, funderAddress)).to.be.false
            expect(await sponsor.getSpenderWhitelisted(walletAddress1, funderAddress)).to.be.false
            await funder.sendTx(sponsor.batchWhitelistUsers([walletAddress, walletAddress1], [true, true]))
            expect(await sponsor.getSpenderWhitelisted(walletAddress, funderAddress)).to.be.true
            expect(await sponsor.getSpenderWhitelisted(walletAddress1, funderAddress)).to.be.true
        })

        it("Batch Blacklist/Whitelist Tokens", async () => {
            const usdtAddr = "0x509Ee0d083DdF8AC028f2a56731412edD63223B9"
            await funder.sendTx(sponsor.setTokenToBlackListMode())
            await funder.sendTx(sponsor.batchBlacklistTokens([paymasterToken, usdtAddr], [false, false]))
            expect(await sponsor.getTokenBlacklisted(paymasterToken, funderAddress)).to.be.false
            expect(await sponsor.getTokenBlacklisted(usdtAddr, funderAddress)).to.be.false
            await funder.sendTx(sponsor.batchBlacklistTokens([paymasterToken, usdtAddr], [true, true]))
            expect(await sponsor.getTokenBlacklisted(paymasterToken, funderAddress)).to.be.true
            expect(await sponsor.getTokenBlacklisted(usdtAddr, funderAddress)).to.be.true

            await funder.sendTx(sponsor.setTokenToWhiteListMode())
            await funder.sendTx(sponsor.batchWhitelistTokens([paymasterToken, usdtAddr], [false, false]))
            expect(await sponsor.getTokenWhitelisted(paymasterToken, funderAddress)).to.be.false
            expect(await sponsor.getTokenWhitelisted(usdtAddr, funderAddress)).to.be.false
            await funder.sendTx(sponsor.batchWhitelistTokens([paymasterToken, usdtAddr], [true, true]))
            expect(await sponsor.getTokenWhitelisted(paymasterToken, funderAddress)).to.be.true
            expect(await sponsor.getTokenWhitelisted(usdtAddr, funderAddress)).to.be.true
        })
    })
}
