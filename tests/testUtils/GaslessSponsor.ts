import { assert, expect } from "chai"
import { Address, Hex, parseEther } from "viem"
import { Auth } from "../../src/auth"
import { ERC721_CONTRACT_INTERFACE } from "../../src/common"
import { GlobalEnvOption, configureEnvironment } from "../../src/config"
import { Chain, NFT, Token } from "../../src/data"
import { UserOpFailureError } from "../../src/errors"
import { GaslessSponsor } from "../../src/sponsors"
import { FunWallet } from "../../src/wallet"
import { getAwsSecret, getTestApiKey } from "../getAWSSecrets"

import "../../fetch-polyfill"

export interface GaslessSponsorTestConfig {
    chainId: number
    stakeAmount: number
    baseToken: string
    walletIndex?: number
    funderIndex?: number
    numRetry?: number
    sponsorBalance?: number
}

export const GaslessSponsorTest = (config: GaslessSponsorTestConfig) => {
    const { stakeAmount } = config

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
                uniqueId: await auth.getWalletUniqueId(config.walletIndex ? config.walletIndex : 99999)
            })

            wallet1 = new FunWallet({
                users: [{ userId: await auth.getAddress() }],
                uniqueId: await auth.getWalletUniqueId(config.funderIndex ? config.funderIndex : 99990)
            })

            walletAddress = await wallet.getAddress()
            walletAddress1 = await wallet1.getAddress()

            funderAddress = await funder.getAddress()
            await configureEnvironment({
                ...options,
                gasSponsor: {
                    sponsorAddress: funderAddress
                }
            })
            sponsor = new GaslessSponsor()
            if ((await sponsor.getBalance(funderAddress)) < parseEther(`${config.sponsorBalance ? config.sponsorBalance : 0.01}`)) {
                const depositInfo1S = await sponsor.getBalance(funderAddress)
                const stake = await sponsor.stake(funderAddress, funderAddress, stakeAmount / 2)
                await funder.sendTx(stake)
                const depositInfo1E = await sponsor.getBalance(funderAddress)
                assert(depositInfo1E > depositInfo1S, "Stake Failed")
            }
        })

        const runActionWithGaslessSponsor = async (wallet: FunWallet) => {
            const chain = await Chain.getChain({ chainIdentifier: config.chainId })
            const nftAddress = await chain.getAddress("TestNFT")
            const nftId = Math.floor(Math.random() * 10_000_000_000)
            const mintTxParams = ERC721_CONTRACT_INTERFACE.encodeTransactionParams(nftAddress, "mint", [await wallet.getAddress(), nftId])
            expect(await Token.getBalance(config.baseToken, walletAddress)).to.be.equal("0")
            const mintOperation = await wallet.createOperation(auth, await auth.getUserId(), mintTxParams)
            expect(await wallet.executeOperation(auth, mintOperation)).to.not.throw
            const nft = new NFT(nftAddress)
            const owner = await nft.ownerOf(nftId)
            expect(owner).to.equal(await wallet.getAddress())
        }

        it("Only User Whitelisted", async () => {
            await funder.sendTx(await sponsor.lockDeposit())
            await funder.sendTx(await sponsor.setToWhitelistMode(funderAddress))
            await funder.sendTx(await sponsor.addSpenderToWhitelist(funderAddress, walletAddress))
            await runActionWithGaslessSponsor(wallet)
            await funder.sendTx(await sponsor.removeSpenderFromWhitelist(funderAddress, walletAddress1))

            try {
                await runActionWithGaslessSponsor(wallet1)
                throw new Error("Wallet is not whitelisted but transaction passed")
            } catch (error: any) {
                assert(error instanceof UserOpFailureError && error.message.includes("AA33"), "Error but not AA33\n" + error)
            }
        })

        it("Blacklist Mode Approved", async () => {
            await funder.sendTx(await sponsor.setToBlacklistMode(funderAddress))
            expect(await sponsor.getListMode(funderAddress)).to.be.true

            await funder.sendTx(await sponsor.addSpenderToBlacklist(funderAddress, walletAddress1))
            expect(await sponsor.getSpenderBlacklistMode(walletAddress1, funderAddress)).to.be.true

            await funder.sendTx(await sponsor.removeSpenderFromBlacklist(funderAddress, walletAddress))
            expect(await sponsor.getSpenderBlacklistMode(walletAddress, funderAddress)).to.be.false

            await runActionWithGaslessSponsor(wallet)
            try {
                await runActionWithGaslessSponsor(wallet1)
                throw new Error("Wallet is not blacklisted but transaction passed")
            } catch (error: any) {
                assert(error instanceof UserOpFailureError && error.message.includes("AA33"), "Error but not AA33\n" + error)
            }
        })

        it("Lock/Unlock Base Tokens", async () => {
            await funder.sendTx(await sponsor.unlockDepositAfter(0))
            await new Promise((resolve) => {
                setTimeout(resolve, 5000)
            })
            expect(await sponsor.getLockState(funderAddress)).to.be.false
            await funder.sendTx(await sponsor.lockDeposit())
            await new Promise((resolve) => {
                setTimeout(resolve, 5000)
            })
            expect(await sponsor.getLockState(funderAddress)).to.be.true
        })

        it("Batch Blacklist/Whitelist Users", async () => {
            await funder.sendTx(await sponsor.setToBlacklistMode(funderAddress))

            await funder.sendTx(await sponsor.batchBlacklistSpenders(funderAddress, [walletAddress, walletAddress1], [false, false]))
            expect(await sponsor.getSpenderBlacklistMode(walletAddress, funderAddress)).to.be.false
            expect(await sponsor.getSpenderBlacklistMode(walletAddress1, funderAddress)).to.be.false
            await funder.sendTx(await sponsor.batchBlacklistSpenders(funderAddress, [walletAddress, walletAddress1], [true, true]))
            expect(await sponsor.getSpenderBlacklistMode(walletAddress, funderAddress)).to.be.true
            expect(await sponsor.getSpenderBlacklistMode(walletAddress1, funderAddress)).to.be.true

            await funder.sendTx(await sponsor.setToWhitelistMode(funderAddress))
            await funder.sendTx(await sponsor.batchWhitelistSpenders(funderAddress, [walletAddress, walletAddress1], [false, false]))
            expect(await sponsor.getSpenderWhitelistMode(walletAddress, funderAddress)).to.be.false
            expect(await sponsor.getSpenderWhitelistMode(walletAddress1, funderAddress)).to.be.false
            await funder.sendTx(await sponsor.batchWhitelistSpenders(funderAddress, [walletAddress, walletAddress1], [true, true]))
            expect(await sponsor.getSpenderWhitelistMode(walletAddress, funderAddress)).to.be.true
            expect(await sponsor.getSpenderWhitelistMode(walletAddress1, funderAddress)).to.be.true
        })
    })
}
