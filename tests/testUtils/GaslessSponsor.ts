import { assert, expect } from "chai"
import { Address, Hex } from "viem"
import { Eoa } from "../../src/auth"
import { GlobalEnvOption, configureEnvironment } from "../../src/config"
import { Token } from "../../src/data"
import { GaslessSponsor } from "../../src/sponsors"
import { fundWallet } from "../../src/utils"
import { FunWallet } from "../../src/wallet"
import { getAwsSecret, getTestApiKey } from "../getAWSSecrets"
import "../../fetch-polyfill"

export interface GaslessSponsorTestConfig {
    chainId: number
    inToken: string
    outToken: string
    stakeAmount: number
    prefund: boolean
    amount?: number
    walletIndex?: number
    funderIndex?: number
}

export const GaslessSponsorTest = (config: GaslessSponsorTestConfig) => {
    describe("GaslessSponsor", function () {
        this.timeout(250_000)
        let funder: Eoa
        let auth: Eoa
        let wallet: FunWallet
        let wallet1: FunWallet
        let sponsor: GaslessSponsor
        let funderAddress: Address
        let walletAddress: Address
        let walletAddress1: Address
        before(async function () {
            auth = new Eoa({ privateKey: (await getAwsSecret("PrivateKeys", "WALLET_PRIVATE_KEY")) as Hex })
            funder = new Eoa({ privateKey: (await getAwsSecret("PrivateKeys", "WALLET_PRIVATE_KEY_2")) as Hex })
            const apiKey = await getTestApiKey()
            const options: GlobalEnvOption = {
                chain: config.chainId.toString(),
                apiKey: apiKey
            }
            await configureEnvironment(options)

            const uid = await auth.getUniqueId()
            wallet = new FunWallet({ uniqueId: uid, index: config.walletIndex ? config.walletIndex : 129856341 })
            wallet1 = new FunWallet({ uniqueId: uid, index: config.funderIndex ? config.funderIndex : 1792811340 })

            walletAddress = await wallet.getAddress()
            walletAddress1 = await wallet1.getAddress()

            if (config.prefund) {
                await fundWallet(funder, wallet, config.stakeAmount / 8)
                await fundWallet(auth, wallet1, config.stakeAmount / 8)
            }
            funderAddress = await funder.getUniqueId()
            await wallet.swap(auth, {
                in: config.inToken,
                amount: config.amount ? config.amount : config.stakeAmount / 4,
                out: config.outToken,
                returnAddress: funderAddress
            })

            await configureEnvironment({
                ...options,
                gasSponsor: {
                    sponsorAddress: funderAddress
                }
            })
            sponsor = new GaslessSponsor()

            const depositInfo1S = await sponsor.getBalance(funderAddress)
            const stake = await sponsor.stake(funderAddress, config.stakeAmount / 2)
            await funder.sendTx(stake)
            const depositInfo1E = await sponsor.getBalance(funderAddress)

            assert(depositInfo1E > depositInfo1S, "Stake Failed")
        })

        const runSwap = async (wallet: FunWallet) => {
            const walletAddress = await wallet.getAddress()
            const tokenBalanceBefore = await Token.getBalance(config.outToken, walletAddress)

            await wallet.swap(auth, {
                in: config.inToken,
                amount: config.amount ? config.amount : 0.0001,
                out: config.outToken
            })

            await new Promise((f) => setTimeout(f, 2000))

            const tokenBalanceAfter = await Token.getBalance(config.outToken, walletAddress)
            assert(tokenBalanceAfter > tokenBalanceBefore, "Swap did not execute")
        }

        it("Only User Whitelisted", async () => {
            const walletAddress = await wallet.getAddress()
            const walletAddress1 = await wallet1.getAddress()

            await funder.sendTx(await sponsor.setToWhitelistMode())
            await funder.sendTx(await sponsor.addSpenderToWhiteList(walletAddress))
            await funder.sendTx(await sponsor.removeSpenderFromWhiteList(walletAddress1))
            await runSwap(wallet)

            try {
                await runSwap(wallet1)
                throw new Error("Wallet is not whitelisted but transaction passed")
            } catch (error: any) {
                assert(error.message.includes("AA33"), "Error but not AA33\n" + error)
            }
        })

        it("Blacklist Mode Approved", async () => {
            await funder.sendTx(await sponsor.setToBlacklistMode())
            expect(await sponsor.getListMode(funderAddress)).to.be.true

            await funder.sendTx(sponsor.addSpenderToBlackList(walletAddress1))
            expect(await sponsor.getSpenderBlacklistMode(walletAddress1, funderAddress)).to.be.true

            await funder.sendTx(sponsor.removeSpenderFromBlackList(walletAddress))
            expect(await sponsor.getSpenderBlacklistMode(walletAddress, funderAddress)).to.be.false

            await runSwap(wallet)
            try {
                await runSwap(wallet1)
                throw new Error("Wallet is not blacklisted but transaction passed")
            } catch (error: any) {
                assert(error.message.includes("AA33"), "Error but not AA33\n" + error)
            }
        })

        it("Lock/Unlock Base Tokens", async () => {
            await funder.sendTx(sponsor.unlockDepositAfter(0))
            expect(await sponsor.getLockState(funderAddress)).to.be.false
            await funder.sendTx(sponsor.lockDeposit())
            expect(await sponsor.getLockState(funderAddress)).to.be.true
        })

        it("Batch Blacklist/Whitelist Users", async () => {
            await funder.sendTx(sponsor.setToBlacklistMode())
            await funder.sendTx(sponsor.batchBlacklistUsers([walletAddress, walletAddress1], [false, false]))
            expect(await sponsor.getSpenderBlacklistMode(walletAddress, funderAddress)).to.be.false
            expect(await sponsor.getSpenderBlacklistMode(walletAddress1, funderAddress)).to.be.false
            await funder.sendTx(sponsor.batchBlacklistUsers([walletAddress, walletAddress1], [true, true]))
            expect(await sponsor.getSpenderBlacklistMode(walletAddress, funderAddress)).to.be.true
            expect(await sponsor.getSpenderBlacklistMode(walletAddress1, funderAddress)).to.be.true

            await funder.sendTx(sponsor.setToWhitelistMode())
            await funder.sendTx(sponsor.batchWhitelistUsers([walletAddress, walletAddress1], [false, false]))
            expect(await sponsor.getSpenderWhitelistMode(walletAddress, funderAddress)).to.be.false
            expect(await sponsor.getSpenderWhitelistMode(walletAddress1, funderAddress)).to.be.false
            await funder.sendTx(sponsor.batchWhitelistUsers([walletAddress, walletAddress1], [true, true]))
            expect(await sponsor.getSpenderWhitelistMode(walletAddress, funderAddress)).to.be.true
            expect(await sponsor.getSpenderWhitelistMode(walletAddress1, funderAddress)).to.be.true
        })
    })
}
