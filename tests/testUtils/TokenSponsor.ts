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
                uniqueId: await auth.getWalletUniqueId(config.walletIndex ? config.walletIndex : 1223452391856349)
            })

            wallet1 = new FunWallet({
                users: [{ userId: await auth.getAddress() }],
                uniqueId: await auth.getWalletUniqueId(config.funderIndex ? config.funderIndex : 2345234)
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
                    in: "eth",
                    amount: config.amount ? config.amount : 0.05,
                    out: config.inToken,
                    returnAddress: walletAddress,
                    chainId: config.chainId
                })
                await wallet.executeOperation(auth, userOp)
                const walletInTokenBalance = await Token.getBalance(config.inToken, walletAddress)
                assert(Number(walletInTokenBalance) > requiredAmount, "wallet does have enough inToken balance")

                const userOp1 = await wallet1.swap(auth, await auth.getAddress(), {
                    in: "eth",
                    amount: config.amount ? config.amount : 0.05,
                    out: config.inToken,
                    returnAddress: walletAddress1,
                    chainId: config.chainId
                })
                await wallet1.executeOperation(auth, userOp1)
                const wallet1InTokenBalance = await Token.getBalance(config.inToken, walletAddress1)
                assert(Number(wallet1InTokenBalance) > requiredAmount, "wallet1 does have enough inToken balance")
            }
            if (mint) {
                const inTokenAddress = await Token.getAddress(config.inToken, options)

                const inTokenMint = ERC20_CONTRACT_INTERFACE.encodeTransactionParams(inTokenAddress, "mint", [
                    await wallet.getAddress(),
                    1000000000000000000000n
                ])
                await auth.sendTx({ ...inTokenMint })
                const paymasterTokenAddress = await Token.getAddress(paymasterToken, options)
                const paymasterTokenMint = ERC20_CONTRACT_INTERFACE.encodeTransactionParams(paymasterTokenAddress, "mint", [
                    funderAddress,
                    1000000000000000000000n
                ])
                await auth.sendTx({ ...paymasterTokenMint })

                const wethAddr = await Token.getAddress("weth", options)
                const userOp = await wallet.transfer(auth, await auth.getAddress(), { to: wethAddr, amount: 0.1 })
                await wallet.executeOperation(auth, userOp)
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

                const approve = await sponsor.approve(funderAddress, paymasterToken, paymasterTokenStakeAmount * 2)
                const deposit = await sponsor.stakeToken(funderAddress, paymasterToken, walletAddress, paymasterTokenStakeAmount)
                const deposit1 = await sponsor.stakeToken(funderAddress, paymasterToken, walletAddress1, paymasterTokenStakeAmount)
                const stakeData = await sponsor.stake(funderAddress, funderAddress, baseStakeAmount)

                await funder.sendTxs([approve, deposit, deposit1, stakeData])

                const depositInfoE = await sponsor.getTokenBalance(paymasterToken, walletAddress)
                const depositInfo1E = await sponsor.getTokenBalance("eth", funderAddress)

                assert(depositInfo1E > depositInfo1S, "Base Stake Failed")
                assert(depositInfoE > depositInfoS, "Token Stake Failed")
                await funder.sendTx(await sponsor.setTokenToBlackListMode(funderAddress))
                await funder.sendTx(await sponsor.batchBlacklistTokens(funderAddress, [paymasterToken], [false]))
            }
        })

        const runSwap = async (wallet: FunWallet, usePermit = false) => {
            const tokenBalanceBefore = await Token.getBalance(config.outToken, walletAddress)
            const userOp = await wallet.swap(
                auth,
                await auth.getAddress(),
                {
                    in: config.inToken,
                    amount: config.amount ? config.amount : 0.0001,
                    out: config.outToken,
                    returnAddress: walletAddress,
                    chainId: config.chainId
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
            if (await sponsor.getTokenListMode((await sponsor.getSponsorAddress())!)) {
                await funder.sendTx(await sponsor.setTokenToWhiteListMode(funderAddress))
            }
            await funder.sendTx(await sponsor.setToWhitelistMode(config.chainId, funderAddress))
            expect(await sponsor.getListMode(funderAddress)).to.be.false

            await funder.sendTx(await sponsor.addSpenderToWhiteList(config.chainId, funderAddress, walletAddress))
            expect(await sponsor.getSpenderWhitelisted(walletAddress, funderAddress)).to.be.true

            await funder.sendTx(await sponsor.removeSpenderFromWhiteList(config.chainId, funderAddress, walletAddress1))
            expect(await sponsor.getSpenderWhitelisted(walletAddress1, funderAddress)).to.be.false

            if (!(await sponsor.getTokenWhitelisted(paymasterToken, (await sponsor.getSponsorAddress())!))) {
                await funder.sendTx(await sponsor.batchWhitelistTokens(funderAddress, [paymasterToken], [true]))
            }
            expect(await sponsor.getTokenWhitelisted(paymasterToken, (await sponsor.getSponsorAddress())!)).to.be.true

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
            if (!(await sponsor.getTokenListMode((await sponsor.getSponsorAddress())!))) {
                await funder.sendTx(await sponsor.setTokenToBlackListMode(funderAddress))
            }
            await funder.sendTx(await sponsor.batchBlacklistTokens(funderAddress, [paymasterToken], [false]))

            await funder.sendTx(await sponsor.setToBlacklistMode(config.chainId, funderAddress))
            expect(await sponsor.getListMode(funderAddress)).to.be.true

            await funder.sendTx(await sponsor.addSpenderToBlackList(config.chainId, funderAddress, walletAddress1))
            expect(await sponsor.getSpenderBlacklisted(walletAddress1, funderAddress)).to.be.true

            await funder.sendTx(await sponsor.removeSpenderFromBlackList(config.chainId, funderAddress, walletAddress))
            expect(await sponsor.getSpenderBlacklisted(walletAddress, funderAddress)).to.be.false
            expect(await sponsor.getTokenBlacklisted(paymasterToken, (await sponsor.getSponsorAddress())!)).to.be.false

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
            expect(await sponsor.getLockState(paymasterToken, funderAddress)).to.be.false
        })

        it("Lock/Unlock Base Tokens", async () => {
            await funder.sendTx(await sponsor.unlockDepositAfter(0))
            await new Promise((f) => setTimeout(f, 2000))
            expect(await sponsor.getLockState("eth", funderAddress)).to.be.false
            await funder.sendTx(await sponsor.lockDeposit())
            expect(await sponsor.getLockState("eth", funderAddress)).to.be.true
        })

        it("Batch Blacklist/Whitelist Users", async () => {
            await funder.sendTx(await sponsor.setToBlacklistMode(config.chainId, funderAddress))
            await funder.sendTx(
                await sponsor.batchBlacklistUsers(config.chainId, funderAddress, [walletAddress, walletAddress1], [false, false])
            )
            await new Promise((f) => setTimeout(f, 2000))

            expect(await sponsor.getSpenderBlacklisted(walletAddress, funderAddress)).to.be.false
            expect(await sponsor.getSpenderBlacklisted(walletAddress1, funderAddress)).to.be.false
            await funder.sendTx(
                await sponsor.batchBlacklistUsers(config.chainId, funderAddress, [walletAddress, walletAddress1], [true, true])
            )
            await new Promise((f) => setTimeout(f, 2000))

            expect(await sponsor.getSpenderBlacklisted(walletAddress, funderAddress)).to.be.true
            expect(await sponsor.getSpenderBlacklisted(walletAddress1, funderAddress)).to.be.true

            await funder.sendTx(await sponsor.setToWhitelistMode(config.chainId, funderAddress))
            await funder.sendTx(
                await sponsor.batchWhitelistUsers(config.chainId, funderAddress, [walletAddress, walletAddress1], [false, false])
            )
            await new Promise((f) => setTimeout(f, 2000))
            expect(await sponsor.getSpenderWhitelisted(walletAddress, funderAddress)).to.be.false
            expect(await sponsor.getSpenderWhitelisted(walletAddress1, funderAddress)).to.be.false
            await funder.sendTx(
                await sponsor.batchWhitelistUsers(config.chainId, funderAddress, [walletAddress, walletAddress1], [true, true])
            )
            await new Promise((f) => setTimeout(f, 2000))
            expect(await sponsor.getSpenderWhitelisted(walletAddress, funderAddress)).to.be.true
            expect(await sponsor.getSpenderWhitelisted(walletAddress1, funderAddress)).to.be.true
            await funder.sendTx(await sponsor.setTokenToBlackListMode(funderAddress))
        })

        it("Batch Blacklist/Whitelist Tokens", async () => {
            const usdtAddr = "0x509Ee0d083DdF8AC028f2a56731412edD63223B9"
            await funder.sendTx(await sponsor.setTokenToBlackListMode(funderAddress))
            await funder.sendTx(await sponsor.batchBlacklistTokens(funderAddress, [paymasterToken, usdtAddr], [false, false]))
            await new Promise((f) => setTimeout(f, 5000))

            expect(await sponsor.getTokenBlacklisted(paymasterToken, funderAddress)).to.be.false
            expect(await sponsor.getTokenBlacklisted(usdtAddr, funderAddress)).to.be.false
            await funder.sendTx(await sponsor.batchBlacklistTokens(funderAddress, [paymasterToken, usdtAddr], [true, true]))
            await new Promise((f) => setTimeout(f, 5000))

            expect(await sponsor.getTokenBlacklisted(paymasterToken, funderAddress)).to.be.true
            expect(await sponsor.getTokenBlacklisted(usdtAddr, funderAddress)).to.be.true

            await funder.sendTx(await sponsor.setTokenToWhiteListMode(funderAddress))
            await funder.sendTx(await sponsor.batchWhitelistTokens(funderAddress, [paymasterToken, usdtAddr], [false, false]))
            await new Promise((f) => setTimeout(f, 5000))

            expect(await sponsor.getTokenWhitelisted(paymasterToken, funderAddress)).to.be.false
            expect(await sponsor.getTokenWhitelisted(usdtAddr, funderAddress)).to.be.false
            await funder.sendTx(await sponsor.batchWhitelistTokens(funderAddress, [paymasterToken, usdtAddr], [true, true]))
            await new Promise((f) => setTimeout(f, 5000))

            expect(await sponsor.getTokenWhitelisted(paymasterToken, funderAddress)).to.be.true
            expect(await sponsor.getTokenWhitelisted(usdtAddr, funderAddress)).to.be.true
        })
    })
}
