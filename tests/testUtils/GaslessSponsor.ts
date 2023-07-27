import { assert, expect } from "chai"
import { Address, Hex } from "viem"
import { Auth } from "../../src/auth"
import { ERC20_CONTRACT_INTERFACE } from "../../src/common"
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
    mint?: boolean
    numRetry?: number
}

export const GaslessSponsorTest = (config: GaslessSponsorTestConfig) => {
    const mint = Object.values(config).includes("mint") ? true : config.mint

    describe("GaslessSponsor", function () {
        this.retries(config.numRetry ? config.numRetry : 0)
        this.timeout(250_000)
        let funder: Auth
        let auth: Auth
        let wallet: FunWallet
        let wallet1: FunWallet
        let sponsor: GaslessSponsor
        let funderAddress: Address
        let walletAddress: Address
        let walletAddress1: Address
        before(async function () {
            auth = new Auth({ privateKey: await getAwsSecret("PrivateKeys", "WALLET_PRIVATE_KEY") })
            funder = new Auth({ privateKey: (await getAwsSecret("PrivateKeys", "WALLET_PRIVATE_KEY_2")) as Hex })
            const apiKey = await getTestApiKey()
            const options: GlobalEnvOption = {
                chain: config.chainId,
                apiKey: apiKey
            }
            await configureEnvironment(options)

            wallet = new FunWallet({
                users: [{ userId: await auth.getAddress() }],
                uniqueId: await auth.getWalletUniqueId(config.chainId.toString(), config.walletIndex ? config.walletIndex : 129856341)
            })

            wallet1 = new FunWallet({
                users: [{ userId: await auth.getAddress() }],
                uniqueId: await auth.getWalletUniqueId(config.chainId.toString(), config.funderIndex ? config.funderIndex : 1792811340)
            })

            walletAddress = await wallet.getAddress()
            walletAddress1 = await wallet1.getAddress()

            if (config.prefund) {
                await fundWallet(auth, wallet, config.stakeAmount / 8)
                await fundWallet(auth, wallet1, config.stakeAmount / 8)
            }

            funderAddress = await funder.getAddress()

            if (mint) {
                const wethAddr = await Token.getAddress("weth", options)
                const userOp = await wallet.transfer(auth, await auth.getAddress(), { to: wethAddr, amount: 0.001 })
                await wallet.executeOperation(auth, userOp)
                const paymasterTokenAddress = await Token.getAddress(config.outToken, options)
                const paymasterTokenMint = ERC20_CONTRACT_INTERFACE.encodeTransactionParams(paymasterTokenAddress, "mint", [
                    funderAddress,
                    1000000000000000000000n
                ])

                await auth.sendTx({ ...paymasterTokenMint })
            }
            await configureEnvironment({
                ...options,
                gasSponsor: {
                    sponsorAddress: funderAddress
                }
            })
            sponsor = new GaslessSponsor()

            const depositInfo1S = await sponsor.getBalance(funderAddress)
            const stake = await sponsor.stake(funderAddress, funderAddress, config.stakeAmount / 4)
            await funder.sendTx(stake)
            const depositInfo1E = await sponsor.getBalance(funderAddress)

            assert(depositInfo1E > depositInfo1S, "Stake Failed")
        })

        const runSwap = async (wallet: FunWallet) => {
            const walletAddress = await wallet.getAddress()
            const tokenBalanceBefore = await Token.getBalanceBN(config.outToken, walletAddress)

            const operation = await wallet.swap(auth, await auth.getAddress(), {
                in: config.inToken,
                amount: config.amount ? config.amount : 0.0001,
                out: config.outToken,
                returnAddress: walletAddress,
                chainId: config.chainId
            })
            await wallet.executeOperation(auth, operation)

            await new Promise((f) => setTimeout(f, 5000))

            const tokenBalanceAfter = await Token.getBalanceBN(config.outToken, walletAddress)
            assert(tokenBalanceAfter > tokenBalanceBefore, "Swap did not execute")
        }

        it("Only User Whitelisted", async () => {
            const walletAddress = await wallet.getAddress()
            const walletAddress1 = await wallet1.getAddress()

            await funder.sendTx(await sponsor.lockDeposit())
            await funder.sendTx(await sponsor.setToWhitelistMode(config.chainId, funderAddress))
            await funder.sendTx(await sponsor.addSpenderToWhiteList(config.chainId, funderAddress, walletAddress))
            await funder.sendTx(await sponsor.removeSpenderFromWhiteList(config.chainId, funderAddress, walletAddress1))
            await runSwap(wallet)

            try {
                await runSwap(wallet1)
                throw new Error("Wallet is not whitelisted but transaction passed")
            } catch (error: any) {
                assert(error.message.includes("AA33"), "Error but not AA33\n" + error)
            }
        })

        it("Blacklist Mode Approved", async () => {
            await funder.sendTx(await sponsor.setToBlacklistMode(config.chainId, funderAddress))
            expect(await sponsor.getListMode(funderAddress)).to.be.true

            await funder.sendTx(await sponsor.addSpenderToBlackList(config.chainId, funderAddress, walletAddress1))
            expect(await sponsor.getSpenderBlacklistMode(walletAddress1, funderAddress)).to.be.true

            await funder.sendTx(await sponsor.removeSpenderFromBlackList(config.chainId, funderAddress, walletAddress))
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
            await funder.sendTx(await sponsor.unlockDepositAfter(0))
            expect(await sponsor.getLockState(funderAddress)).to.be.false
            await funder.sendTx(await sponsor.lockDeposit())
            expect(await sponsor.getLockState(funderAddress)).to.be.true
        })

        it("Batch Blacklist/Whitelist Users", async () => {
            await funder.sendTx(await sponsor.setToBlacklistMode(config.chainId, funderAddress))

            await funder.sendTx(
                await sponsor.batchBlacklistUsers(config.chainId, funderAddress, [walletAddress, walletAddress1], [false, false])
            )
            expect(await sponsor.getSpenderBlacklistMode(walletAddress, funderAddress)).to.be.false
            expect(await sponsor.getSpenderBlacklistMode(walletAddress1, funderAddress)).to.be.false
            await funder.sendTx(
                await sponsor.batchBlacklistUsers(config.chainId, funderAddress, [walletAddress, walletAddress1], [true, true])
            )
            expect(await sponsor.getSpenderBlacklistMode(walletAddress, funderAddress)).to.be.true
            expect(await sponsor.getSpenderBlacklistMode(walletAddress1, funderAddress)).to.be.true

            await funder.sendTx(await sponsor.setToWhitelistMode(config.chainId, funderAddress))
            await funder.sendTx(
                await sponsor.batchWhitelistUsers(config.chainId, funderAddress, [walletAddress, walletAddress1], [false, false])
            )
            expect(await sponsor.getSpenderWhitelistMode(walletAddress, funderAddress)).to.be.false
            expect(await sponsor.getSpenderWhitelistMode(walletAddress1, funderAddress)).to.be.false
            await funder.sendTx(
                await sponsor.batchWhitelistUsers(config.chainId, funderAddress, [walletAddress, walletAddress1], [true, true])
            )
            expect(await sponsor.getSpenderWhitelistMode(walletAddress, funderAddress)).to.be.true
            expect(await sponsor.getSpenderWhitelistMode(walletAddress1, funderAddress)).to.be.true
        })
    })
}
