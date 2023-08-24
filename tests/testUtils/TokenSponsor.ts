import { assert, expect } from "chai"
import { Address, Hex } from "viem"
import { Auth } from "../../src/auth"
import { ERC20_CONTRACT_INTERFACE } from "../../src/common"
import { GlobalEnvOption, configureEnvironment } from "../../src/config"
import { Token } from "../../src/data"
import { UserOpFailureError } from "../../src/errors"
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
        let auth: Auth
        let funder: Auth
        let wallet: FunWallet
        let wallet1: FunWallet
        let funderAddress: Address
        let walletAddress: Address
        let walletAddress1: Address
        let sponsor: TokenSponsor
        let options: GlobalEnvOption

        before(async function () {
            auth = new Auth({ privateKey: (await getAwsSecret("PrivateKeys", "WALLET_PRIVATE_KEY_2")) as Hex })
            funder = new Auth({ privateKey: (await getAwsSecret("PrivateKeys", "WALLET_PRIVATE_KEY")) as Hex })
            const apiKey = await getTestApiKey()
            options = {
                chain: config.chainId,
                apiKey: apiKey
            }

            await configureEnvironment(options)

            wallet = new FunWallet({
                users: [{ userId: await auth.getAddress() }],
                uniqueId: await auth.getWalletUniqueId(config.walletIndex ? config.walletIndex : 1823452391856349)
            })

            wallet1 = new FunWallet({
                users: [{ userId: await auth.getAddress() }],
                uniqueId: await auth.getWalletUniqueId(config.funderIndex ? config.funderIndex : 5345234)
            })

            walletAddress = await wallet.getAddress()
            walletAddress1 = await wallet1.getAddress()

            funderAddress = await funder.getAddress()

            if (config.prefund) {
                await fundWallet(funder, wallet, config.prefundAmt ? config.prefundAmt : 0.1)
                await fundWallet(funder, wallet1, config.prefundAmt ? config.prefundAmt : 0.1)

                const requiredAmount =
                    (config.amount ? config.amount : 0.0001) * 10 ** Number(await Token.getDecimals(config.inToken, options))
                const userOp = await wallet.swap(auth, await auth.getAddress(), {
                    tokenIn: "eth",
                    amount: config.amount ? config.amount : 0.05,
                    tokenOut: config.inToken,
                    returnAddress: walletAddress
                })
                await wallet.executeOperation(auth, userOp)
                const walletInTokenBalance = await Token.getBalance(config.inToken, walletAddress)
                assert(Number(walletInTokenBalance) > requiredAmount, "wallet does have enough inToken balance")

                const userOp1 = await wallet1.swap(auth, await auth.getAddress(), {
                    tokenIn: "eth",
                    amount: config.amount ? config.amount : 0.05,
                    tokenOut: config.inToken,
                    returnAddress: walletAddress1
                })
                await wallet1.executeOperation(auth, userOp1)
                const wallet1InTokenBalance = await Token.getBalance(config.inToken, walletAddress1)
                assert(Number(wallet1InTokenBalance) > requiredAmount, "wallet1 does have enough inToken balance")
            }
            if (mint) {
                const paymasterTokenAddress = await Token.getAddress(paymasterToken, options)
                const paymasterTokenMint = ERC20_CONTRACT_INTERFACE.encodeTransactionParams(paymasterTokenAddress, "mint", [
                    funderAddress,
                    BigInt(10e18)
                ])
                await auth.sendTx({ ...paymasterTokenMint })
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
                const depositInfoS = await sponsor.getTokenBalance(walletAddress, paymasterToken)
                const depositInfo1S = await sponsor.getTokenBalance(funderAddress, "eth")

                const approve = await sponsor.approve(funderAddress, paymasterToken, paymasterTokenStakeAmount * 2)
                const deposit = await sponsor.depositToken(funderAddress, paymasterToken, walletAddress, paymasterTokenStakeAmount)
                const deposit1 = await sponsor.depositToken(funderAddress, paymasterToken, walletAddress1, paymasterTokenStakeAmount)
                const stakeData = await sponsor.stake(funderAddress, funderAddress, baseStakeAmount)

                await funder.sendTxs([approve, deposit, deposit1, stakeData])

                const depositInfoE = await sponsor.getTokenBalance(walletAddress, paymasterToken)
                const depositInfo1E = await sponsor.getTokenBalance(funderAddress, "eth")
                assert(depositInfo1E > depositInfo1S, "Base Stake Failed")
                assert(depositInfoE > depositInfoS, "Token Stake Failed")
                await funder.sendTx(await sponsor.setTokenToBlacklistMode(funderAddress))
                await funder.sendTx(await sponsor.batchBlacklistTokens(funderAddress, [paymasterToken], [false]))
            }
        })

        const runSwap = async (wallet: FunWallet, usePermit = false) => {
            const tokenBalanceBefore = await Token.getBalance(config.outToken, walletAddress)
            const userOp = await wallet.swap(
                auth,
                await auth.getAddress(),
                {
                    tokenIn: config.inToken,
                    amount: config.amount ? config.amount : 0.0001,
                    tokenOut: config.outToken,
                    returnAddress: walletAddress
                },
                {
                    chain: config.chainId,
                    gasSponsor: {
                        sponsorAddress: funderAddress,
                        token: paymasterToken,
                        usePermit
                    }
                }
            )
            await wallet.executeOperation(auth, userOp)
            await new Promise((f) => setTimeout(f, 2000))

            const tokenBalanceAfter = await Token.getBalance(config.outToken, walletAddress)
            assert(tokenBalanceAfter > tokenBalanceBefore, "Swap did not execute")
        }

        it("Only User Whitelisted", async () => {
            await funder.sendTx(await sponsor.lockDeposit())
            if (await sponsor.getTokenListMode((await sponsor.getFunSponsorAddress())!)) {
                await funder.sendTx(await sponsor.setTokenToWhitelistMode(funderAddress))
            }
            await funder.sendTx(await sponsor.setToWhitelistMode(funderAddress))
            expect(await sponsor.getListMode(funderAddress)).to.be.false

            await funder.sendTx(await sponsor.addSpenderToWhitelist(funderAddress, walletAddress))
            expect(await sponsor.getSpenderWhitelisted(walletAddress, funderAddress)).to.be.true

            await funder.sendTx(await sponsor.removeSpenderFromWhitelist(funderAddress, walletAddress1))
            expect(await sponsor.getSpenderWhitelisted(walletAddress1, funderAddress)).to.be.false

            if (!(await sponsor.getTokenWhitelisted((await sponsor.getFunSponsorAddress())!, paymasterToken))) {
                await funder.sendTx(await sponsor.batchWhitelistTokens(funderAddress, [paymasterToken], [true]))
            }
            expect(await sponsor.getTokenWhitelisted((await sponsor.getFunSponsorAddress())!, paymasterToken)).to.be.true

            expect(await runSwap(wallet)).to.not.throw
            try {
                await runSwap(wallet1)
                throw new Error("Wallet is not whitelisted but transaction passed")
            } catch (error: any) {
                assert(error instanceof UserOpFailureError && error.message.includes("AA33"), "Error but not AA33\n" + error)
            }
        })

        it("Only User Whitelisted with permit", async () => {
            expect(await runSwap(wallet, true)).to.not.throw
        })

        it("Blacklist Mode Approved", async () => {
            const funder = new Auth({ privateKey: await getAwsSecret("PrivateKeys", "WALLET_PRIVATE_KEY") })
            if (!(await sponsor.getTokenListMode((await sponsor.getFunSponsorAddress())!))) {
                await funder.sendTx(await sponsor.setTokenToBlacklistMode(funderAddress))
            }
            await funder.sendTx(await sponsor.batchBlacklistTokens(funderAddress, [paymasterToken], [false]))

            await funder.sendTx(await sponsor.setToBlacklistMode(funderAddress))
            expect(await sponsor.getListMode(funderAddress)).to.be.true

            await funder.sendTx(await sponsor.addSpenderToBlacklist(funderAddress, walletAddress1))
            expect(await sponsor.getSpenderBlacklisted(walletAddress1, funderAddress)).to.be.true

            await funder.sendTx(await sponsor.removeSpenderFromBlacklist(funderAddress, walletAddress))
            expect(await sponsor.getSpenderBlacklisted(walletAddress, funderAddress)).to.be.false
            expect(await sponsor.getTokenBlacklisted((await sponsor.getFunSponsorAddress())!, paymasterToken)).to.be.false

            expect(await runSwap(wallet)).not.to.throw
            try {
                await runSwap(wallet1)
                throw new Error("Wallet is not blacklisted but transaction passed")
            } catch (error: any) {
                assert(error instanceof UserOpFailureError && error.message.includes("AA33"), "Error but not AA33\n" + error)
            }
        })
        it("Blacklist Mode Approved with permit", async () => {
            expect(await runSwap(wallet, true)).not.to.throw
        })

        it("Lock/Unlock Tokens", async () => {
            await funder.sendTx(await sponsor.unlockTokenDepositAfter(paymasterToken, 0))
            await new Promise((f) => setTimeout(f, 2000))
            expect(await sponsor.getLockState(funderAddress, paymasterToken)).to.be.false
        })

        it("Lock/Unlock Base Tokens", async () => {
            await funder.sendTx(await sponsor.unlockDepositAfter(0))
            await new Promise((f) => setTimeout(f, 2000))
            expect(await sponsor.getLockState(funderAddress, "eth")).to.be.false
            await funder.sendTx(await sponsor.lockDeposit())
            expect(await sponsor.getLockState(funderAddress, "eth")).to.be.true
        })

        it("Batch Blacklist/Whitelist Users", async () => {
            await funder.sendTx(await sponsor.setToBlacklistMode(funderAddress))
            await funder.sendTx(await sponsor.batchBlacklistSpenders(funderAddress, [walletAddress, walletAddress1], [false, false]))
            await new Promise((f) => setTimeout(f, 2000))

            expect(await sponsor.getSpenderBlacklisted(walletAddress, funderAddress)).to.be.false
            expect(await sponsor.getSpenderBlacklisted(walletAddress1, funderAddress)).to.be.false
            await funder.sendTx(await sponsor.batchBlacklistSpenders(funderAddress, [walletAddress, walletAddress1], [true, true]))
            await new Promise((f) => setTimeout(f, 2000))

            expect(await sponsor.getSpenderBlacklisted(walletAddress, funderAddress)).to.be.true
            expect(await sponsor.getSpenderBlacklisted(walletAddress1, funderAddress)).to.be.true

            await funder.sendTx(await sponsor.setToWhitelistMode(funderAddress))
            await funder.sendTx(await sponsor.batchWhitelistSpenders(funderAddress, [walletAddress, walletAddress1], [false, false]))
            await new Promise((f) => setTimeout(f, 2000))
            expect(await sponsor.getSpenderWhitelisted(walletAddress, funderAddress)).to.be.false
            expect(await sponsor.getSpenderWhitelisted(walletAddress1, funderAddress)).to.be.false
            await funder.sendTx(await sponsor.batchWhitelistSpenders(funderAddress, [walletAddress, walletAddress1], [true, true]))
            await new Promise((f) => setTimeout(f, 2000))
            expect(await sponsor.getSpenderWhitelisted(walletAddress, funderAddress)).to.be.true
            expect(await sponsor.getSpenderWhitelisted(walletAddress1, funderAddress)).to.be.true
            await funder.sendTx(await sponsor.setTokenToBlacklistMode(funderAddress))
        })

        it("Batch Blacklist/Whitelist Tokens", async () => {
            const usdtAddr = "0x509Ee0d083DdF8AC028f2a56731412edD63223B9"
            await funder.sendTx(await sponsor.setTokenToBlacklistMode(funderAddress))
            await funder.sendTx(await sponsor.batchBlacklistTokens(funderAddress, [paymasterToken, usdtAddr], [false, false]))
            await new Promise((f) => setTimeout(f, 5000))

            expect(await sponsor.getTokenBlacklisted(funderAddress, paymasterToken)).to.be.false
            expect(await sponsor.getTokenBlacklisted(usdtAddr, funderAddress)).to.be.false
            await funder.sendTx(await sponsor.batchBlacklistTokens(funderAddress, [paymasterToken, usdtAddr], [true, true]))
            await new Promise((f) => setTimeout(f, 5000))

            expect(await sponsor.getTokenBlacklisted(funderAddress, paymasterToken)).to.be.true
            expect(await sponsor.getTokenBlacklisted(usdtAddr, funderAddress)).to.be.true

            await funder.sendTx(await sponsor.setTokenToWhitelistMode(funderAddress))
            await funder.sendTx(await sponsor.batchWhitelistTokens(funderAddress, [paymasterToken, usdtAddr], [false, false]))
            await new Promise((f) => setTimeout(f, 5000))

            expect(await sponsor.getTokenWhitelisted(funderAddress, paymasterToken)).to.be.false
            expect(await sponsor.getTokenWhitelisted(usdtAddr, funderAddress)).to.be.false
            await funder.sendTx(await sponsor.batchWhitelistTokens(funderAddress, [paymasterToken, usdtAddr], [true, true]))
            await new Promise((f) => setTimeout(f, 5000))

            expect(await sponsor.getTokenWhitelisted(funderAddress, paymasterToken)).to.be.true
            expect(await sponsor.getTokenWhitelisted(usdtAddr, funderAddress)).to.be.true
        })
    })
}
