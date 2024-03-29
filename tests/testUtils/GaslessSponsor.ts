import { assert, expect } from "chai"
import { Address, Hex, parseEther } from "viem"
import { Auth } from "../../src/auth"
import { ERC721_CONTRACT_INTERFACE } from "../../src/common"
import { GlobalEnvOption } from "../../src/config"
import { Chain } from "../../src/data"
import { UserOpFailureError } from "../../src/errors"
import { FunKit } from "../../src/FunKit"
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
        let fun: FunKit

        let chain: Chain

        before(async function () {
            const apiKey = await getTestApiKey()
            const options: GlobalEnvOption = {
                chain: config.chainId,
                apiKey: apiKey
            }

            fun = new FunKit(options)
            funder = fun.getAuth({ privateKey: (await getAwsSecret("PrivateKeys", "WALLET_PRIVATE_KEY_2")) as Hex })
            funderAddress = await funder.getAddress()
            sponsor = fun.setGaslessSponsor(funderAddress)

            auth = fun.getAuth({ privateKey: await getAwsSecret("PrivateKeys", "WALLET_PRIVATE_KEY") })

            chain = await fun.getChain(config.chainId)
            wallet = await fun.createWalletWithAuth(auth, config.walletIndex ? config.walletIndex : 99999)
            wallet1 = await fun.createWalletWithAuth(auth, config.funderIndex ? config.funderIndex : 99990)

            walletAddress = await wallet.getAddress()
            walletAddress1 = await wallet1.getAddress()

            await sponsor.getBalance(funderAddress), parseEther(`${config.sponsorBalance ? config.sponsorBalance : 0.01}`)
            if ((await sponsor.getBalance(funderAddress)) < parseEther(`${config.sponsorBalance ? config.sponsorBalance : 0.01}`)) {
                const depositInfo1S = await sponsor.getBalance(funderAddress)
                const stake = await sponsor.stake(funderAddress, stakeAmount / 2)
                await funder.sendTx(stake, chain)
                const depositInfo1E = await sponsor.getBalance(funderAddress)
                assert(depositInfo1E > depositInfo1S, "Stake Failed")
            }
        })

        const runActionWithGaslessSponsor = async (currentWallet: FunWallet) => {
            const nftAddress = chain.getAddress("TestNFT")
            const nftId = Math.floor(Math.random() * 10_000_000_000)
            const mintTxParams = ERC721_CONTRACT_INTERFACE.encodeTransactionParams(nftAddress, "mint", [
                await currentWallet.getAddress(),
                nftId
            ])

            expect(await currentWallet.getToken(config.baseToken).getBalance()).to.be.equal("0")
            const mintOperation = await currentWallet.createOperation(auth, await auth.getUserId(), mintTxParams)
            expect(await currentWallet.executeOperation(auth, mintOperation)).to.not.throw
            const nft = fun.getNFT(nftAddress)
            const owner = await nft.ownerOf(nftId)
            expect(owner).to.equal(await currentWallet.getAddress())
        }

        it("Only User Whitelisted", async () => {
            await funder.sendTx(await sponsor.lockDeposit(), chain)
            await funder.sendTx(await sponsor.setToWhitelistMode(), chain)
            await funder.sendTx(await sponsor.addSpenderToWhitelist(walletAddress), chain)
            await runActionWithGaslessSponsor(wallet)
            await funder.sendTx(await sponsor.removeSpenderFromWhitelist(walletAddress1), chain)

            try {
                await runActionWithGaslessSponsor(wallet1)
                throw new Error("Wallet is not whitelisted but transaction passed")
            } catch (error: any) {
                assert(
                    error instanceof UserOpFailureError &&
                        (error.message.includes("the sponsor must approve the spender") || error.message.includes("AA33"),
                        "Error but not AA33\n" + error)
                )
            }
        })

        it("Blacklist Mode Approved", async () => {
            await funder.sendTx(await sponsor.setToBlacklistMode(), chain)
            expect(await sponsor.getListMode(funderAddress)).to.be.true

            await funder.sendTx(await sponsor.addSpenderToBlacklist(walletAddress1), chain)
            expect(await sponsor.getSpenderBlacklistMode(walletAddress1, funderAddress)).to.be.true

            await funder.sendTx(await sponsor.removeSpenderFromBlacklist(walletAddress), chain)
            expect(await sponsor.getSpenderBlacklistMode(walletAddress, funderAddress)).to.be.false

            await runActionWithGaslessSponsor(wallet)
            try {
                await runActionWithGaslessSponsor(wallet1)
                throw new Error("Wallet is not blacklisted but transaction passed")
            } catch (error: any) {
                assert(
                    error instanceof UserOpFailureError &&
                        (error.message.includes("the sponsor must approve the spender") || error.message.includes("AA33"),
                        "Error but not AA33\n" + error)
                )
            }
        })

        it("Lock/Unlock Base Tokens", async () => {
            await funder.sendTx(await sponsor.unlockDepositAfter(0), chain)
            await new Promise((resolve) => {
                setTimeout(resolve, 10_000)
            })
            expect(await sponsor.getLockState(funderAddress)).to.be.false
            await funder.sendTx(await sponsor.lockDeposit(), chain)
            await new Promise((resolve) => {
                setTimeout(resolve, 10_000)
            })
            expect(await sponsor.getLockState(funderAddress)).to.be.true
        })

        it("Batch Blacklist/Whitelist Users", async () => {
            await funder.sendTx(await sponsor.setToBlacklistMode(), chain)

            await funder.sendTx(await sponsor.batchBlacklistSpenders([walletAddress, walletAddress1], [false, false]), chain)
            expect(await sponsor.getSpenderBlacklistMode(walletAddress, funderAddress)).to.be.false
            expect(await sponsor.getSpenderBlacklistMode(walletAddress1, funderAddress)).to.be.false
            await funder.sendTx(await sponsor.batchBlacklistSpenders([walletAddress, walletAddress1], [true, true]), chain)
            expect(await sponsor.getSpenderBlacklistMode(walletAddress, funderAddress)).to.be.true
            expect(await sponsor.getSpenderBlacklistMode(walletAddress1, funderAddress)).to.be.true

            await funder.sendTx(await sponsor.setToWhitelistMode(), chain)
            await funder.sendTx(await sponsor.batchWhitelistSpenders([walletAddress, walletAddress1], [false, false]), chain)
            expect(await sponsor.getSpenderWhitelistMode(walletAddress, funderAddress)).to.be.false
            expect(await sponsor.getSpenderWhitelistMode(walletAddress1, funderAddress)).to.be.false
            await funder.sendTx(await sponsor.batchWhitelistSpenders([walletAddress, walletAddress1], [true, true]), chain)
            expect(await sponsor.getSpenderWhitelistMode(walletAddress, funderAddress)).to.be.true
            expect(await sponsor.getSpenderWhitelistMode(walletAddress1, funderAddress)).to.be.true
        })
    })
}
