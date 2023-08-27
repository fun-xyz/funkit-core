import { assert, expect } from "chai"
import { Address, Hex } from "viem"
import { tokenTransferTransactionParams } from "../../src/actions"
import { Auth } from "../../src/auth"
import { ERC20_CONTRACT_INTERFACE, ERC721_CONTRACT_INTERFACE } from "../../src/common"
import { GlobalEnvOption, configureEnvironment } from "../../src/config"
import { Chain, NFT, Token } from "../../src/data"
import { TokenSponsor } from "../../src/sponsors"
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
    walletIndex?: number
}

export const TokenSponsorTest = (config: TokenSponsorTestConfig) => {
    const paymasterToken = config.paymasterToken

    describe("TokenSponsor", function () {
        this.retries(config.numRetry ? config.numRetry : 0)
        this.timeout(300_000)
        let funder: Auth
        let wallet: FunWallet
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
            const tokenBalanceBefore = Number(await Token.getBalanceBN(config.paymasterToken, walletAddress))
            const requiredAmount = config.paymasterTokensRequired * 10 ** Number(await Token.getDecimals(config.paymasterToken, options))
            if (config.mintPaymasterToken) {
                const paymasterTokenAddress = await Token.getAddress(paymasterToken, options)
                const paymasterTokenMint = ERC20_CONTRACT_INTERFACE.encodeTransactionParams(paymasterTokenAddress, "mint", [
                    walletAddress,
                    requiredAmount
                ])
                await funder.sendTx({ ...paymasterTokenMint })
            }
            if (tokenBalanceBefore < requiredAmount) {
                const sendPaymasterTokenTx = await tokenTransferTransactionParams({
                    token: config.paymasterToken,
                    to: walletAddress,
                    amount: requiredAmount - tokenBalanceBefore
                })
                await funder.sendTx(sendPaymasterTokenTx)
            }
        })

        it("Stake eth into the paymaster from the sponsor", async () => {
            const baseStakeAmount = config.baseTokenStakeAmt * 10 ** Number(await Token.getDecimals(config.paymasterToken, options))
            const stakedEthAmount = Number(await sponsor.getTokenBalance(funderAddress, "eth"))
            if (stakedEthAmount < baseStakeAmount) {
                const stakeData = await sponsor.stake(funderAddress, funderAddress, baseStakeAmount)
                await funder.sendTx(stakeData)
            }
            const stakedEthAmountAfter = Number(await sponsor.getTokenBalance(funderAddress, "eth"))
            assert(stakedEthAmountAfter > baseStakeAmount, "Stake Failed")
        })

        it("Whitelist a funwallet and use the token paymaster", async () => {
            // Allow the sponsor to whitelist tokens that are acceptable for use
            if (await sponsor.getTokenListMode(funderAddress)) {
                await funder.sendTx(await sponsor.setTokenToWhitelistMode(funderAddress))
            }
            expect(await sponsor.getTokenListMode(funderAddress)).to.be.false

            // Allow the sponsor to whitelist users that are acceptable for use
            if (!(await sponsor.getListMode(funderAddress))) {
                await funder.sendTx(await sponsor.setToWhitelistMode(funderAddress))
            }
            expect(await sponsor.getListMode(funderAddress)).to.be.false

            // Whitelist the funwallet that wants to use the token paymaster
            if (!(await sponsor.getSpenderWhitelisted(walletAddress, funderAddress))) {
                await funder.sendTx(await sponsor.addSpenderToWhitelist(funderAddress, walletAddress))
            }
            expect(await sponsor.getSpenderWhitelisted(walletAddress, funderAddress)).to.be.true

            // Whitelist the token that the funwallet wants to use to pay for gas
            if (!(await sponsor.getTokenWhitelisted((await sponsor.getFunSponsorAddress())!, paymasterToken))) {
                await funder.sendTx(await sponsor.batchWhitelistTokens(funderAddress, [paymasterToken], [true]))
            }
            expect(await sponsor.getTokenWhitelisted((await sponsor.getFunSponsorAddress())!, paymasterToken)).to.be.true

            await runActionWithTokenSponsor()
        })

        // it("Enable blacklist mode but don't turn blacklist the funwallet and use the token paymaster", async () => {})

        // it("Lock and Unlock tokens from the token paymaster", async () => {})

        // it("Lock and Unlock the native gas token from the token paymaster", async () => {})

        // it("Batch Blacklist and whitelist users", async () => {})

        // it("Batch Blacklist and whitelist tokens", async () => {})

        // it("Use the fun owned token paymaster", async () => {})

        /**
         * This function is used to test the token paymaster. This makes sure the wallet has no gas tokens in it that could
         * be used to pay for gas, then it mints a new NFT and checks that the wallet is the owner of the NFT using the
         * token paymaster
         */
        const runActionWithTokenSponsor = async () => {
            const chain = await Chain.getChain({ chainIdentifier: options.chain })
            const nftAddress = await chain.getAddress("TestNFT")
            const nftId = Math.floor(Math.random() * 10_000_000_000)
            const mintTxParams = ERC721_CONTRACT_INTERFACE.encodeTransactionParams(nftAddress, "mint", [await wallet.getAddress(), nftId])
            expect(await Token.getBalance(config.baseToken, walletAddress)).to.be.equal("0")
            const mintOperation = await wallet.createOperation(funder, await funder.getUserId(), mintTxParams)
            await wallet.executeOperation(funder, mintOperation)
            const nft = new NFT(nftAddress)
            const owner = await nft.ownerOf(nftId)
            expect(owner).to.equal(await wallet.getAddress())
        }
    })
}
