import { assert, expect } from "chai"
import { Address, Hex } from "viem"
import { Auth } from "../../src/auth"
import { ERC20_CONTRACT_INTERFACE, ERC721_CONTRACT_INTERFACE } from "../../src/common"
import { GlobalEnvOption, configureEnvironment } from "../../src/config"
import { Chain, NFT, Token } from "../../src/data"
import { FunKit } from "../../src/FunKit"
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
        let chain: Chain

        let fun: FunKit
        let paymasterTokenObj: Token
        let baseTokenObj: Token

        before(async function () {
            const apiKey = await getTestApiKey()
            options = {
                chain: config.chainId,
                apiKey: apiKey
            }

            fun = new FunKit(options)
            funder = fun.getAuth({ privateKey: (await getAwsSecret("PrivateKeys", "WALLET_PRIVATE_KEY")) as Hex })
            funderAddress = await funder.getAddress()
            sponsor = fun.setTokenSponsor({
                sponsorAddress: funderAddress,
                token: paymasterToken,
                usePermit: true
            })

            chain = await fun.getChain(config.chainId)

            wallet = await fun.createWalletWithAuth(funder, config.walletIndex ? config.walletIndex : 1823452391856349)
            unpermittedWallet = await fun.createWalletWithAuth(funder, 18234526349)
            approveWallet = await fun.createWalletWithAuth(funder, 182134526349)

            walletAddress = await wallet.getAddress()
            paymasterTokenObj = wallet.getToken(paymasterToken)
            baseTokenObj = wallet.getToken(config.baseToken)
        })

        it("Acquire paymaster tokens for the funwallet", async () => {
            const requiredAmount = await paymasterTokenObj.getDecimalAmount(config.paymasterTokensRequired)
            if (config.mintPaymasterToken) {
                const paymasterTokenAddress = await paymasterTokenObj.getAddress()
                const paymasterTokenMint1 = ERC20_CONTRACT_INTERFACE.encodeTransactionParams(paymasterTokenAddress, "mint", [
                    walletAddress,
                    requiredAmount
                ])
                await funder.sendTx({ ...paymasterTokenMint1 }, chain)
                const paymasterTokenMint2 = ERC20_CONTRACT_INTERFACE.encodeTransactionParams(paymasterTokenAddress, "mint", [
                    funderAddress,
                    requiredAmount
                ])
                await funder.sendTx({ ...paymasterTokenMint2 }, chain)
            }
            if (Number(await paymasterTokenObj.getBalanceBN()) < requiredAmount) {
                await funder.sendTx(await paymasterTokenObj.transfer(walletAddress, config.paymasterTokensRequired), chain)
            }
        })

        it("Stake eth into the paymaster from the sponsor", async () => {
            const baseStakeAmount = config.baseTokenStakeAmt * 10 ** 18 // account for eth decimals
            const stakedEthAmount = Number(await sponsor.getTokenBalance(funderAddress, "eth"))
            if (stakedEthAmount < baseStakeAmount) {
                const stakeData = await sponsor.stake(funderAddress, funderAddress, config.baseTokenStakeAmt)
                await funder.sendTx(stakeData, chain)
            }
            const stakedEthAmountAfter = Number(await sponsor.getTokenBalance(funderAddress, "eth"))
            assert(stakedEthAmountAfter >= baseStakeAmount, "Stake Failed")
        })

        it("Whitelist a funwallet and use the token paymaster with permit", async () => {
            // Allow the sponsor to whitelist tokens that are acceptable for use
            if (await sponsor.getTokenListMode(funderAddress)) {
                await funder.sendTx(await sponsor.setTokenToWhitelistMode(funderAddress), chain)
                await new Promise((f) => setTimeout(f, 5000))
            }
            expect(await sponsor.getTokenListMode(funderAddress)).to.be.false

            // Allow the sponsor to whitelist users that are acceptable for use
            if (await sponsor.getListMode(funderAddress)) {
                await funder.sendTx(await sponsor.setToWhitelistMode(funderAddress), chain)
                await new Promise((f) => setTimeout(f, 5000))
            }
            expect(await sponsor.getListMode(funderAddress)).to.be.false

            // Whitelist the funwallet that wants to use the token paymaster
            if (!(await sponsor.getSpenderWhitelisted(walletAddress, funderAddress))) {
                await funder.sendTx(await sponsor.addSpenderToWhitelist(funderAddress, walletAddress), chain)
            }
            expect(await sponsor.getSpenderWhitelisted(walletAddress, funderAddress)).to.be.true
            if (!(await sponsor.getSpenderWhitelisted(await approveWallet.getAddress(), funderAddress))) {
                await funder.sendTx(await sponsor.addSpenderToWhitelist(funderAddress, await approveWallet.getAddress()), chain)
            }
            expect(await sponsor.getSpenderWhitelisted(await approveWallet.getAddress(), funderAddress)).to.be.true
            if (!(await sponsor.getSpenderWhitelisted(await unpermittedWallet.getAddress(), funderAddress))) {
                await funder.sendTx(await sponsor.removeSpenderFromWhitelist(funderAddress, await unpermittedWallet.getAddress()), chain)
            }
            expect(await sponsor.getSpenderWhitelisted(await unpermittedWallet.getAddress(), funderAddress)).to.be.false

            // Whitelist the token that the funwallet wants to use to pay for gas
            if (!(await sponsor.getTokenWhitelisted((await sponsor.getFunSponsorAddress())!, paymasterToken))) {
                await funder.sendTx(await sponsor.batchWhitelistTokens(funderAddress, [paymasterToken], [true]), chain)
            }
            expect(await sponsor.getTokenWhitelisted((await sponsor.getFunSponsorAddress())!, paymasterToken)).to.be.true

            await runActionWithTokenSponsorPermit(wallet)
            await runActionWithTokenSponsorApprove(approveWallet)
            await runActionWithTokenSponsorPermitFail(unpermittedWallet)
        })

        it("Enable blacklist mode but don't turn blacklist the funwallet and use the token paymaster with permit", async () => {
            // Allow the sponsor to blacklist tokens that are acceptable for use
            if (!(await sponsor.getTokenListMode(funderAddress))) {
                await funder.sendTx(await sponsor.setTokenToBlacklistMode(funderAddress), chain)
            }
            expect(await sponsor.getTokenListMode(funderAddress)).to.be.true

            // Allow the sponsor to allow all users to use the paymaster except for blacklisted users
            if (!(await sponsor.getListMode(funderAddress))) {
                await funder.sendTx(await sponsor.setToBlacklistMode(funderAddress), chain)
                await new Promise((f) => setTimeout(f, 3000))
            }
            expect(await sponsor.getListMode(funderAddress)).to.be.true

            // Make sure the token is not blacklisted
            if (await sponsor.getTokenBlacklisted((await sponsor.getFunSponsorAddress())!, paymasterToken)) {
                await funder.sendTx(await sponsor.batchBlacklistTokens(funderAddress, [paymasterToken], [false]), chain)
            }
            expect(await sponsor.getTokenBlacklisted((await sponsor.getFunSponsorAddress())!, paymasterToken)).to.be.false

            // Make sure the funwallet is not blacklisted
            if (await sponsor.getSpenderBlacklisted(walletAddress, funderAddress)) {
                await funder.sendTx(await sponsor.batchBlacklistSpenders(funderAddress, [walletAddress], [false]), chain)
            }
            expect(await sponsor.getSpenderBlacklisted(walletAddress, funderAddress)).to.be.false

            // Make sure the funwallet is not blacklisted
            if (!(await sponsor.getSpenderBlacklisted(await unpermittedWallet.getAddress(), funderAddress))) {
                await funder.sendTx(
                    await sponsor.batchBlacklistSpenders(funderAddress, [await unpermittedWallet.getAddress()], [true]),
                    chain
                )
            }
            expect(await sponsor.getSpenderBlacklisted(await unpermittedWallet.getAddress(), funderAddress)).to.be.true

            await runActionWithTokenSponsorPermit(wallet)
            await runActionWithTokenSponsorApprove(approveWallet)
            await runActionWithTokenSponsorPermitFail(unpermittedWallet)
        })

        it("Lock and Unlock tokens from the token paymaster", async () => {
            await funder.sendTx(await sponsor.unlockTokenDepositAfter(paymasterToken, 0), chain)
            await new Promise((f) => setTimeout(f, 5000))
            expect(await sponsor.getLockState(funderAddress, paymasterToken)).to.be.false
            await funder.sendTx(await sponsor.lockTokenDeposit(paymasterToken), chain)
            await new Promise((f) => setTimeout(f, 5000))
            expect(await sponsor.getLockState(funderAddress, paymasterToken)).to.be.true
        })

        it("Lock and Unlock the native gas token from the token paymaster", async () => {
            await funder.sendTx(await sponsor.unlockDepositAfter(0), chain)
            await new Promise((f) => setTimeout(f, 5000))
            expect(await sponsor.getLockState(funderAddress, "eth")).to.be.false
            await funder.sendTx(await sponsor.lockDeposit(), chain)
            await new Promise((f) => setTimeout(f, 5000))
            expect(await sponsor.getLockState(funderAddress, "eth")).to.be.true
        })

        it("Batch Blacklist and whitelist users", async () => {
            // blacklist spenders
            await funder.sendTx(await sponsor.batchBlacklistSpenders(funderAddress, [walletAddress], [false]), chain)
            await new Promise((f) => setTimeout(f, 2000))
            expect(await sponsor.getSpenderBlacklisted(walletAddress, funderAddress)).to.be.false

            // remove spender from blacklist
            await funder.sendTx(await sponsor.batchBlacklistSpenders(funderAddress, [walletAddress], [true]), chain)
            await new Promise((f) => setTimeout(f, 2000))
            expect(await sponsor.getSpenderBlacklisted(walletAddress, funderAddress)).to.be.true

            // whitelist spender
            await funder.sendTx(await sponsor.batchWhitelistSpenders(funderAddress, [walletAddress], [false]), chain)
            await new Promise((f) => setTimeout(f, 2000))
            expect(await sponsor.getSpenderWhitelisted(walletAddress, funderAddress)).to.be.false

            // remove spender from whitelist
            await funder.sendTx(await sponsor.batchWhitelistSpenders(funderAddress, [walletAddress], [true]), chain)
            await new Promise((f) => setTimeout(f, 2000))
            expect(await sponsor.getSpenderWhitelisted(walletAddress, funderAddress)).to.be.true
        })

        it("Batch Blacklist and whitelist tokens", async () => {
            // blacklist tokens
            await funder.sendTx(await sponsor.batchBlacklistTokens(funderAddress, [paymasterToken], [false]), chain)
            await new Promise((f) => setTimeout(f, 5000))
            expect(await sponsor.getTokenBlacklisted(funderAddress, paymasterToken)).to.be.false

            // remove token from paymaster blacklist to allow users to pay for transactions using this sponsor
            await funder.sendTx(await sponsor.batchBlacklistTokens(funderAddress, [paymasterToken], [false]), chain)
            await new Promise((f) => setTimeout(f, 5000))
            expect(await sponsor.getTokenBlacklisted(funderAddress, paymasterToken)).to.be.false

            // whitelist tokens
            await funder.sendTx(await sponsor.batchWhitelistTokens(funderAddress, [paymasterToken], [false]), chain)
            await new Promise((f) => setTimeout(f, 5000))
            expect(await sponsor.getTokenWhitelisted(funderAddress, paymasterToken)).to.be.false

            // whitelist tokens
            await funder.sendTx(await sponsor.batchWhitelistTokens(funderAddress, [paymasterToken], [true]), chain)
            await new Promise((f) => setTimeout(f, 5000))
            expect(await sponsor.getTokenWhitelisted(funderAddress, paymasterToken)).to.be.true
        })

        it.only("Use the fun owned token paymaster", async () => {
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
            const nftAddress = chain.getAddress("TestNFT")
            const nftId = Math.floor(Math.random() * 10_000_000_000)
            await funder.sendTx(await sponsor.lockTokenDeposit(paymasterToken), chain)
            const mintTxParams = ERC721_CONTRACT_INTERFACE.encodeTransactionParams(nftAddress, "mint", [await wallet.getAddress(), nftId])
            expect(await baseTokenObj.getBalance()).to.be.equal("0")
            const mintOperation = await wallet.createOperation(funder, await funder.getUserId(), mintTxParams)
            await wallet.executeOperation(funder, mintOperation)
            const nft = new NFT(nftAddress, options)
            const owner = await nft.ownerOf(nftId)
            expect(owner).to.equal(await wallet.getAddress())
        }

        /**
         * This function is used to test the token paymaster. This makes sure the wallet has no gas tokens in it that could
         * be used to pay for gas, then it mints a new NFT and checks that the wallet is the owner of the NFT using the
         * token paymaster
         */
        const runActionWithTokenSponsorPermitFail = async (wallet: FunWallet) => {
            const nftAddress = await chain.getAddress("TestNFT")
            const nftId = Math.floor(Math.random() * 10_000_000_000)
            const mintTxParams = ERC721_CONTRACT_INTERFACE.encodeTransactionParams(nftAddress, "mint", [await wallet.getAddress(), nftId])
            expect(await baseTokenObj.getBalance()).to.be.equal("0")
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
            const nftAddress = await chain.getAddress("TestNFT")
            const nftId = Math.floor(Math.random() * 10_000_000_000)
            const mintTxParams = ERC721_CONTRACT_INTERFACE.encodeTransactionParams(nftAddress, "mint", [await wallet.getAddress(), nftId])
            if (Number(await baseTokenObj.getBalance()) < config.prefundAmt) {
                await fundWallet(funder, wallet, config.prefundAmt)
            }

            if (Number(await paymasterTokenObj.getBalance()) < config.paymasterTokensRequired) {
                await funder.sendTx(await paymasterTokenObj.transfer(await wallet.getAddress(), config.paymasterTokensRequired), chain)
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
            const nft = new NFT(nftAddress, options)
            const owner = await nft.ownerOf(nftId)
            expect(owner).to.equal(await wallet.getAddress())
        }
    })
}
