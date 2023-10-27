import { assert, expect } from "chai"
import { Address, Hex } from "viem"
import { Auth } from "../../src/auth"
import { ERC20_CONTRACT_INTERFACE, ERC721_CONTRACT_INTERFACE } from "../../src/common"
import { GlobalEnvOption, configureEnvironment } from "../../src/config"
import { Chain, NFT, Token } from "../../src/data"
import { TokenSponsor } from "../../src/sponsors"
import { fundWallet } from "../../src/utils"
import { FunWallet } from "../../src/wallet"
import { getAwsSecret, getTestApiKey } from "../getAWSSecrets"

import "../../fetch-polyfill"

export interface TokenSponsorTestConfig {
    chainId: number
    paymasterToken: string
    baseToken: string
    baseTokenStakeAmt: number
    mintPaymasterToken: boolean
    numRetry: number
    paymasterTokensRequired: number // needed
    prefundAmt: number
    walletIndex?: number
}

export const TokenSponsorTest = (config: TokenSponsorTestConfig) => {
    const paymasterToken = config.paymasterToken

    describe("TokenSponsor", function () {
        this.retries(config.numRetry ? config.numRetry : 0)
        this.timeout(500_000)
        let funder: Auth
        let wallet: FunWallet
        let unpermittedWallet: FunWallet
        let approveWallet: FunWallet
        let funderAddress: Address
        let walletAddress: Address
        let sponsor: TokenSponsor
        let options: GlobalEnvOption

        before(async function () {
            funder = new Auth({ privateKey: (await getAwsSecret("PrivateKeys", "WALLET_PRIVATE_KEY")) as Hex })
            const apiKey = await getTestApiKey()
            options = {
                chain: config.chainId,
                apiKey: apiKey
            }
            await configureEnvironment(options)

            wallet = new FunWallet({
                users: [{ userId: await funder.getAddress() }],
                uniqueId: await funder.getWalletUniqueId(config.walletIndex ? config.walletIndex : 1823452391856349)
            })
            unpermittedWallet = new FunWallet({
                users: [{ userId: await funder.getAddress() }],
                uniqueId: await funder.getWalletUniqueId(18234526349)
            })
            approveWallet = new FunWallet({
                users: [{ userId: await funder.getAddress() }],
                uniqueId: await funder.getWalletUniqueId(182134526349)
            })

            walletAddress = await wallet.getAddress()
            funderAddress = await funder.getAddress()

            options.gasSponsor = {
                sponsorAddress: funderAddress,
                token: paymasterToken,
                usePermit: true
            }
            await configureEnvironment(options)
            sponsor = new TokenSponsor()
        })

        it("Acquire paymaster tokens for the funwallet", async () => {
            const requiredAmount = await Token.getDecimalAmount(config.paymasterToken, config.paymasterTokensRequired)
            if (config.mintPaymasterToken) {
                const paymasterTokenAddress = await Token.getAddress(paymasterToken, options)
                const paymasterTokenMint1 = ERC20_CONTRACT_INTERFACE.encodeTransactionParams(paymasterTokenAddress, "mint", [
                    walletAddress,
                    requiredAmount
                ])
                await funder.sendTx({ ...paymasterTokenMint1 })
                const paymasterTokenMint2 = ERC20_CONTRACT_INTERFACE.encodeTransactionParams(paymasterTokenAddress, "mint", [
                    funderAddress,
                    requiredAmount
                ])
                await funder.sendTx({ ...paymasterTokenMint2 })
            }
            if (Number(await Token.getBalanceBN(config.paymasterToken, walletAddress)) < requiredAmount) {
                await funder.sendTx(await new Token(config.paymasterToken).transfer(walletAddress, config.paymasterTokensRequired))
            }
        })

        it("Stake eth into the paymaster from the sponsor", async () => {
            const baseStakeAmount = config.baseTokenStakeAmt * 10 ** 18 // account for eth decimals
            const stakedEthAmount = Number(await sponsor.getTokenBalance(funderAddress, "eth"))
            if (stakedEthAmount < baseStakeAmount) {
                const stakeData = await sponsor.stake(funderAddress, config.baseTokenStakeAmt)
                await funder.sendTx(stakeData)
            }
            const stakedEthAmountAfter = Number(await sponsor.getTokenBalance(funderAddress, "eth"))
            assert(stakedEthAmountAfter >= baseStakeAmount, "Stake Failed")
        })

        it("Whitelist a funwallet and use the token paymaster with permit", async () => {
            // Allow the sponsor to whitelist tokens that are acceptable for use
            if (await sponsor.getTokenListMode(funderAddress)) {
                await funder.sendTx(await sponsor.setTokenToWhitelistMode())
                await new Promise((f) => setTimeout(f, 5000))
            }
            expect(await sponsor.getTokenListMode(funderAddress)).to.be.false

            // Allow the sponsor to whitelist users that are acceptable for use
            if (await sponsor.getListMode(funderAddress)) {
                await funder.sendTx(await sponsor.setToWhitelistMode())
                await new Promise((f) => setTimeout(f, 5000))
            }
            expect(await sponsor.getListMode(funderAddress)).to.be.false

            // Whitelist the funwallet that wants to use the token paymaster
            if (!(await sponsor.getSpenderWhitelisted(walletAddress, funderAddress))) {
                await funder.sendTx(await sponsor.addSpenderToWhitelist(walletAddress))
            }
            expect(await sponsor.getSpenderWhitelisted(walletAddress, funderAddress)).to.be.true

            if (!(await sponsor.getSpenderWhitelisted(await approveWallet.getAddress(), funderAddress))) {
                await funder.sendTx(await sponsor.addSpenderToWhitelist(await approveWallet.getAddress()))
            }
            expect(await sponsor.getSpenderWhitelisted(await approveWallet.getAddress(), funderAddress)).to.be.true

            if (!(await sponsor.getSpenderWhitelisted(await unpermittedWallet.getAddress(), funderAddress))) {
                await funder.sendTx(await sponsor.removeSpenderFromWhitelist(await unpermittedWallet.getAddress()))
            }
            expect(await sponsor.getSpenderWhitelisted(await unpermittedWallet.getAddress(), funderAddress)).to.be.false

            // Whitelist the token that the funwallet wants to use to pay for gas
            if (!(await sponsor.getTokenWhitelisted((await sponsor.getFunSponsorAddress())!, paymasterToken))) {
                await funder.sendTx(await sponsor.batchWhitelistTokens([paymasterToken], [true]))
            }
            expect(await sponsor.getTokenWhitelisted((await sponsor.getFunSponsorAddress())!, paymasterToken)).to.be.true

            await runActionWithTokenSponsorPermit(wallet)
            await runActionWithTokenSponsorApprove(approveWallet)
            await runActionWithTokenSponsorPermitFail(unpermittedWallet)
        })

        it("Enable blacklist mode but don't turn blacklist the funwallet and use the token paymaster with permit", async () => {
            // Allow the sponsor to blacklist tokens that are acceptable for use
            if (!(await sponsor.getTokenListMode(funderAddress))) {
                await funder.sendTx(await sponsor.setTokenToBlacklistMode())
            }
            expect(await sponsor.getTokenListMode(funderAddress)).to.be.true

            // Allow the sponsor to allow all users to use the paymaster except for blacklisted users
            if (!(await sponsor.getListMode(funderAddress))) {
                await funder.sendTx(await sponsor.setToBlacklistMode())
                await new Promise((f) => setTimeout(f, 3000))
            }
            expect(await sponsor.getListMode(funderAddress)).to.be.true

            // Make sure the token is not blacklisted
            if (await sponsor.getTokenBlacklisted((await sponsor.getFunSponsorAddress())!, paymasterToken)) {
                await funder.sendTx(await sponsor.batchBlacklistTokens([paymasterToken], [false]))
            }
            expect(await sponsor.getTokenBlacklisted((await sponsor.getFunSponsorAddress())!, paymasterToken)).to.be.false

            // Make sure the funwallet is not blacklisted
            if (await sponsor.getSpenderBlacklisted(walletAddress, funderAddress)) {
                await funder.sendTx(await sponsor.batchBlacklistSpenders([walletAddress], [false]))
            }
            expect(await sponsor.getSpenderBlacklisted(walletAddress, funderAddress)).to.be.false

            // Make sure the funwallet is not blacklisted
            if (!(await sponsor.getSpenderBlacklisted(await unpermittedWallet.getAddress(), funderAddress))) {
                await funder.sendTx(await sponsor.batchBlacklistSpenders([await unpermittedWallet.getAddress()], [true]))
            }
            expect(await sponsor.getSpenderBlacklisted(await unpermittedWallet.getAddress(), funderAddress)).to.be.true

            await runActionWithTokenSponsorPermit(wallet)
            await runActionWithTokenSponsorApprove(approveWallet)
            await runActionWithTokenSponsorPermitFail(unpermittedWallet)
        })

        it("Lock and Unlock tokens from the token paymaster", async () => {
            await funder.sendTx(await sponsor.unlockTokenDepositAfter(paymasterToken, 0))
            await new Promise((f) => setTimeout(f, 5000))
            expect(await sponsor.getLockState(funderAddress, paymasterToken)).to.be.false
            await funder.sendTx(await sponsor.lockTokenDeposit(paymasterToken))
            await new Promise((f) => setTimeout(f, 5000))
            expect(await sponsor.getLockState(funderAddress, paymasterToken)).to.be.true
        })

        it("Lock and Unlock the native gas token from the token paymaster", async () => {
            await funder.sendTx(await sponsor.unlockDepositAfter(0))
            await new Promise((f) => setTimeout(f, 5000))
            expect(await sponsor.getLockState(funderAddress, "eth")).to.be.false
            await funder.sendTx(await sponsor.lockDeposit())
            await new Promise((f) => setTimeout(f, 5000))
            expect(await sponsor.getLockState(funderAddress, "eth")).to.be.true
        })

        it("Batch Blacklist and whitelist users", async () => {
            // blacklist spenders
            await funder.sendTx(await sponsor.batchBlacklistSpenders([walletAddress], [false]))
            await new Promise((f) => setTimeout(f, 2000))
            expect(await sponsor.getSpenderBlacklisted(walletAddress, funderAddress)).to.be.false

            // remove spender from blacklist
            await funder.sendTx(await sponsor.batchBlacklistSpenders([walletAddress], [true]))
            await new Promise((f) => setTimeout(f, 2000))
            expect(await sponsor.getSpenderBlacklisted(walletAddress, funderAddress)).to.be.true

            // whitelist spender
            await funder.sendTx(await sponsor.batchWhitelistSpenders([walletAddress], [false]))
            await new Promise((f) => setTimeout(f, 2000))
            expect(await sponsor.getSpenderWhitelisted(walletAddress, funderAddress)).to.be.false

            // remove spender from whitelist
            await funder.sendTx(await sponsor.batchWhitelistSpenders([walletAddress], [true]))
            await new Promise((f) => setTimeout(f, 2000))
            expect(await sponsor.getSpenderWhitelisted(walletAddress, funderAddress)).to.be.true
        })

        it("Batch Blacklist and whitelist tokens", async () => {
            // blacklist tokens
            await funder.sendTx(await sponsor.batchBlacklistTokens([paymasterToken], [false]))
            await new Promise((f) => setTimeout(f, 5000))
            expect(await sponsor.getTokenBlacklisted(funderAddress, paymasterToken)).to.be.false

            // remove token from paymaster blacklist to allow users to pay for transactions using this sponsor
            await funder.sendTx(await sponsor.batchBlacklistTokens([paymasterToken], [false]))
            await new Promise((f) => setTimeout(f, 5000))
            expect(await sponsor.getTokenBlacklisted(funderAddress, paymasterToken)).to.be.false

            // whitelist tokens
            await funder.sendTx(await sponsor.batchWhitelistTokens([paymasterToken], [false]))
            await new Promise((f) => setTimeout(f, 5000))
            expect(await sponsor.getTokenWhitelisted(funderAddress, paymasterToken)).to.be.false

            // whitelist tokens
            await funder.sendTx(await sponsor.batchWhitelistTokens([paymasterToken], [true]))
            await new Promise((f) => setTimeout(f, 5000))
            expect(await sponsor.getTokenWhitelisted(funderAddress, paymasterToken)).to.be.true
        })

        it("Use the fun owned token paymaster", async () => {
            const funOwnedTokenSponsor = "0x40C0cCa76088D45106c2D74D0B4B6405865f22De"
            options.gasSponsor = {
                sponsorAddress: funOwnedTokenSponsor,
                token: paymasterToken,
                usePermit: true
            }
            await configureEnvironment(options)
            await runActionWithTokenSponsorPermit(wallet)
            await runActionWithTokenSponsorApprove(approveWallet)
        })

        /**
         * This function is used to test the token paymaster. This makes sure the wallet has no gas tokens in it that could
         * be used to pay for gas, then it mints a new NFT and checks that the wallet is the owner of the NFT using the
         * token paymaster
         */
        const runActionWithTokenSponsorPermit = async (wallet: FunWallet) => {
            const chain = await Chain.getChain({ chainIdentifier: options.chain })
            const nftAddress = await chain.getAddress("TestNFT")
            const nftId = Math.floor(Math.random() * 10_000_000_000)
            await funder.sendTx(await sponsor.lockTokenDeposit(paymasterToken))
            const mintTxParams = ERC721_CONTRACT_INTERFACE.encodeTransactionParams(nftAddress, "mint", [await wallet.getAddress(), nftId])
            expect(await Token.getBalance(config.baseToken, await wallet.getAddress())).to.be.equal("0")
            const mintOperation = await wallet.createOperation(funder, await funder.getUserId(), mintTxParams)
            await wallet.executeOperation(funder, mintOperation)
            const nft = new NFT(nftAddress)
            const owner = await nft.ownerOf(nftId)
            expect(owner).to.equal(await wallet.getAddress())
        }

        /**
         * This function is used to test the token paymaster. This makes sure the wallet has no gas tokens in it that could
         * be used to pay for gas, then it mints a new NFT and checks that the wallet is the owner of the NFT using the
         * token paymaster
         */
        const runActionWithTokenSponsorPermitFail = async (wallet: FunWallet) => {
            const chain = await Chain.getChain({ chainIdentifier: options.chain })
            const nftAddress = await chain.getAddress("TestNFT")
            const nftId = Math.floor(Math.random() * 10_000_000_000)
            const mintTxParams = ERC721_CONTRACT_INTERFACE.encodeTransactionParams(nftAddress, "mint", [await wallet.getAddress(), nftId])
            expect(await Token.getBalance(config.baseToken, await wallet.getAddress())).to.be.equal("0")
            try {
                await wallet.createOperation(funder, await funder.getUserId(), mintTxParams)
            } catch (e: any) {
                assert(
                    e.toString().includes("FW327") ||
                        e.toString().includes("FW350") ||
                        e.toString().includes("the sponsor must approve the spender")
                )
            }
        }

        /**
         * This function is used to test the token paymaster. This makes sure the wallet has no gas tokens in it that could
         * be used to pay for gas, then it mints a new NFT and checks that the wallet is the owner of the NFT using the
         * token paymaster
         */
        const runActionWithTokenSponsorApprove = async (wallet: FunWallet) => {
            const chain = await Chain.getChain({ chainIdentifier: options.chain })
            const nftAddress = await chain.getAddress("TestNFT")
            const nftId = Math.floor(Math.random() * 10_000_000_000)
            const mintTxParams = ERC721_CONTRACT_INTERFACE.encodeTransactionParams(nftAddress, "mint", [await wallet.getAddress(), nftId])
            if (Number(await Token.getBalance(config.baseToken, await wallet.getAddress())) < config.prefundAmt) {
                await fundWallet(funder, wallet, config.prefundAmt)
            }

            if (Number(await Token.getBalance(config.paymasterToken, await wallet.getAddress())) < config.paymasterTokensRequired) {
                await funder.sendTx(
                    await new Token(config.paymasterToken).transfer(await wallet.getAddress(), config.paymasterTokensRequired)
                )
            }

            const approveTokenToPaymaster = await wallet.tokenApprove(funder, await funder.getUserId(), {
                token: config.paymasterToken,
                spender: await sponsor.getPaymasterAddress(),
                amount: config.paymasterTokensRequired
            })
            await wallet.executeOperation(funder, approveTokenToPaymaster)

            const mintOperation = await wallet.createOperation(funder, await funder.getUserId(), mintTxParams, {
                ...options,
                gasSponsor: {
                    ...options.gasSponsor,
                    usePermit: false
                }
            })
            await wallet.executeOperation(funder, mintOperation)
            const nft = new NFT(nftAddress)
            const owner = await nft.ownerOf(nftId)
            expect(owner).to.equal(await wallet.getAddress())
        }
    })
}
