import { assert, expect } from "chai"
import { Address, Hex } from "viem"
import { Eoa } from "../../src/auth"
import { ERC20_CONTRACT_INTERFACE } from "../../src/common"
import { GlobalEnvOption, configureEnvironment } from "../../src/config"
import { Token, getChainFromData } from "../../src/data"
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
    amount?: number
    prefundAmt?: number
    mint?: boolean
    batchTokenAddress?: string
    numRetry?: number
}

export const TokenSponsorTest = (config: TokenSponsorTestConfig) => {
    const paymasterToken = config.paymasterToken
    const mint = Object.values(config).includes("mint") ? true : config.mint

    describe("TokenSponsor", function () {
        this.retries(config.numRetry ? config.numRetry : 0)
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
                chain: config.chainId,
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
                await fundWallet(funder, wallet, config.prefundAmt ? config.prefundAmt : 0.1)
                await fundWallet(funder, wallet1, config.prefundAmt ? config.prefundAmt : 0.1)
            }
            if (mint) {
                const chain = await getChainFromData(options.chain)
                const inTokenAddress = await Token.getAddress(config.inToken, options)
                if ((await chain.getChainId()) !== "5") {
                    const inTokenMint = ERC20_CONTRACT_INTERFACE.encodeTransactionData(inTokenAddress, "mint", [
                        await wallet.getAddress(),
                        1000000000000000000000n
                    ])
                    inTokenMint.chain = chain
                    await auth.sendTx(inTokenMint)
                    const paymasterTokenAddress = await Token.getAddress(paymasterToken, options)
                    const paymasterTokenMint = ERC20_CONTRACT_INTERFACE.encodeTransactionData(paymasterTokenAddress, "mint", [
                        funderAddress,
                        1000000000000000000000n
                    ])
                    paymasterTokenMint.chain = chain
                    await auth.sendTx(paymasterTokenMint)
                }
                const wethAddr = await Token.getAddress("weth", options)
                await wallet.transferEth(auth, { to: wethAddr, amount: 0.1 })
            }

            options.gasSponsor = {
                sponsorAddress: funderAddress,
                token: paymasterToken
            }
            await configureEnvironment(options)

            sponsor = new TokenSponsor()
            if (config.stake) {
                const baseStakeAmount = config.baseTokenStakeAmt
                const paymasterTokenStakeAmount = config.paymasterTokenStakeAmt

                const depositInfoS = await sponsor.getTokenBalance(paymasterToken, walletAddress)
                const depositInfo1S = await sponsor.getTokenBalance("eth", funderAddress)

                const approve = await sponsor.approve(paymasterToken, paymasterTokenStakeAmount * 2)
                const deposit = await sponsor.stakeToken(paymasterToken, walletAddress, paymasterTokenStakeAmount)
                const deposit1 = await sponsor.stakeToken(paymasterToken, walletAddress1, paymasterTokenStakeAmount)
                const stakeData = await sponsor.stake(funderAddress, baseStakeAmount)

                await funder.sendTxs([approve, deposit, deposit1, stakeData])

                const depositInfoE = await sponsor.getTokenBalance(paymasterToken, walletAddress)
                const depositInfo1E = await sponsor.getTokenBalance("eth", funderAddress)

                assert(depositInfo1E > depositInfo1S, "Base Stake Failed")
                assert(depositInfoE > depositInfoS, "Token Stake Failed")
                await funder.sendTx(sponsor.setTokenToBlackListMode())
                await funder.sendTx(sponsor.batchBlacklistTokens([paymasterToken], [false]))
            }
        })

        const runSwap = async (wallet: FunWallet) => {
            const tokenBalanceBefore = await Token.getBalance(config.outToken, walletAddress)
            const userOp = await wallet.uniswapV3Swap(auth, {
                in: config.inToken,
                amount: config.amount ? config.amount : 0.0001,
                out: config.outToken,
                returnAddress: walletAddress,
                chainId: config.chainId
            })
            console.log("userOP", await wallet.executeOperation(auth, userOp))
            await new Promise((f) => setTimeout(f, 2000))

            const tokenBalanceAfter = await Token.getBalance(config.outToken, walletAddress)
            assert(tokenBalanceAfter > tokenBalanceBefore, "Swap did not execute")
        }

        it("Only User Whitelisted", async () => {
            await funder.sendTx(sponsor.lockDeposit())
            if (await sponsor.getTokenListMode((await sponsor.getSponsorAddress())!)) {
                await funder.sendTx(await sponsor.setTokenToWhiteListMode())
            }
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

        it.only("Blacklist Mode Approved", async () => {
            const funder = new Eoa({ privateKey: await getAwsSecret("PrivateKeys", "WALLET_PRIVATE_KEY") })
            if (!(await sponsor.getTokenListMode((await sponsor.getSponsorAddress())!))) {
                await funder.sendTx(await sponsor.setTokenToBlackListMode())
            }
            await funder.sendTx(await sponsor.setToBlacklistMode())
            expect(await sponsor.getListMode(funderAddress)).to.be.true

            await funder.sendTx(sponsor.addSpenderToBlackList(walletAddress1))
            expect(await sponsor.getSpenderBlacklisted(walletAddress1, funderAddress)).to.be.true
            console.log("token list mode", await sponsor.getTokenListMode((await sponsor.getSponsorAddress())!))

            await funder.sendTx(sponsor.removeSpenderFromBlackList(walletAddress))
            expect(await sponsor.getSpenderBlacklisted(walletAddress, funderAddress)).to.be.false
            console.log("is token whitelisted", await sponsor.getTokenWhitelisted(paymasterToken, (await sponsor.getSponsorAddress())!))

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
            await new Promise((f) => setTimeout(f, 2000))
            expect(await sponsor.getLockState(paymasterToken, funderAddress)).to.be.false
        })

        it("Lock/Unlock Base Tokens", async () => {
            await funder.sendTx(sponsor.unlockDepositAfter(0))
            await new Promise((f) => setTimeout(f, 2000))
            expect(await sponsor.getLockState("eth", funderAddress)).to.be.false
            await funder.sendTx(sponsor.lockDeposit())
            expect(await sponsor.getLockState("eth", funderAddress)).to.be.true
        })

        it("Batch Blacklist/Whitelist Users", async () => {
            await funder.sendTx(sponsor.setToBlacklistMode())
            await funder.sendTx(sponsor.batchBlacklistUsers([walletAddress, walletAddress1], [false, false]))
            await new Promise((f) => setTimeout(f, 2000))

            expect(await sponsor.getSpenderBlacklisted(walletAddress, funderAddress)).to.be.false
            expect(await sponsor.getSpenderBlacklisted(walletAddress1, funderAddress)).to.be.false
            await funder.sendTx(sponsor.batchBlacklistUsers([walletAddress, walletAddress1], [true, true]))
            await new Promise((f) => setTimeout(f, 2000))

            expect(await sponsor.getSpenderBlacklisted(walletAddress, funderAddress)).to.be.true
            expect(await sponsor.getSpenderBlacklisted(walletAddress1, funderAddress)).to.be.true

            await funder.sendTx(sponsor.setToWhitelistMode())
            await funder.sendTx(sponsor.batchWhitelistUsers([walletAddress, walletAddress1], [false, false]))
            await new Promise((f) => setTimeout(f, 2000))
            expect(await sponsor.getSpenderWhitelisted(walletAddress, funderAddress)).to.be.false
            expect(await sponsor.getSpenderWhitelisted(walletAddress1, funderAddress)).to.be.false
            await funder.sendTx(sponsor.batchWhitelistUsers([walletAddress, walletAddress1], [true, true]))
            await new Promise((f) => setTimeout(f, 2000))
            expect(await sponsor.getSpenderWhitelisted(walletAddress, funderAddress)).to.be.true
            expect(await sponsor.getSpenderWhitelisted(walletAddress1, funderAddress)).to.be.true
            await funder.sendTx(sponsor.setTokenToBlackListMode())
        })

        it("Batch Blacklist/Whitelist Tokens", async () => {
            const usdtAddr = "0x509Ee0d083DdF8AC028f2a56731412edD63223B9"
            await funder.sendTx(sponsor.setTokenToBlackListMode())
            await funder.sendTx(sponsor.batchBlacklistTokens([paymasterToken, usdtAddr], [false, false]))
            await new Promise((f) => setTimeout(f, 2000))

            expect(await sponsor.getTokenBlacklisted(paymasterToken, funderAddress)).to.be.false
            expect(await sponsor.getTokenBlacklisted(usdtAddr, funderAddress)).to.be.false
            await funder.sendTx(sponsor.batchBlacklistTokens([paymasterToken, usdtAddr], [true, true]))
            await new Promise((f) => setTimeout(f, 2000))

            expect(await sponsor.getTokenBlacklisted(paymasterToken, funderAddress)).to.be.true
            expect(await sponsor.getTokenBlacklisted(usdtAddr, funderAddress)).to.be.true

            await funder.sendTx(sponsor.setTokenToWhiteListMode())
            await funder.sendTx(sponsor.batchWhitelistTokens([paymasterToken, usdtAddr], [false, false]))
            await new Promise((f) => setTimeout(f, 2000))

            expect(await sponsor.getTokenWhitelisted(paymasterToken, funderAddress)).to.be.false
            expect(await sponsor.getTokenWhitelisted(usdtAddr, funderAddress)).to.be.false
            await funder.sendTx(sponsor.batchWhitelistTokens([paymasterToken, usdtAddr], [true, true]))
            await new Promise((f) => setTimeout(f, 2000))

            expect(await sponsor.getTokenWhitelisted(paymasterToken, funderAddress)).to.be.true
            expect(await sponsor.getTokenWhitelisted(usdtAddr, funderAddress)).to.be.true
        })
    })
}
