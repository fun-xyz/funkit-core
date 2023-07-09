import { assert } from "chai"
import { Address } from "viem"
import { Auth, Eoa } from "../../src/auth"
import { ERC721_CONTRACT_INTERFACE } from "../../src/common"
import { GlobalEnvOption, configureEnvironment } from "../../src/config"
import { getChainFromData } from "../../src/data"
import { NFT } from "../../src/data/NFT"
import { fundWallet } from "../../src/utils"
import { FunWallet } from "../../src/wallet"
import { getAwsSecret, getTestApiKey } from "../getAWSSecrets"
import "../../fetch-polyfill"
export interface NFTTestConfig {
    chainId: number
    baseToken: string
    prefund: boolean
    tokenId: number
    testNFTName: string
    testNFTAddress: string
    amount?: number
    numRetry?: number
}
export const NFTTest = (config: NFTTestConfig) => {
    const { prefund } = config
    let nftAddress: Address

    describe("NFT Tests", function () {
        this.retries(config.numRetry ? config.numRetry : 0)
        this.timeout(300_000_000)
        let auth: Auth
        let wallet1: FunWallet
        let wallet2: FunWallet
        let apiKey: string
        let nftId: number
        before(async function () {
            apiKey = await getTestApiKey()
            const options: GlobalEnvOption = {
                chain: config.chainId,
                apiKey: apiKey
            }
            await configureEnvironment(options)
            auth = new Eoa({ privateKey: await getAwsSecret("PrivateKeys", "WALLET_PRIVATE_KEY") })
            wallet1 = new FunWallet({ uniqueId: await auth.getUniqueId(), index: 1792811340 })
            wallet2 = new FunWallet({ uniqueId: await auth.getUniqueId(), index: 1792811341 })
            if (prefund) {
                await fundWallet(auth, wallet1, config.amount ? config.amount : 0.2)
                await fundWallet(auth, wallet2, config.amount ? config.amount : 0.2)
            }
            const chain = await getChainFromData(options.chain)
            nftId = Math.floor(Math.random() * 10_000_000_000)
            nftAddress = await chain.getAddress("TestNFT")
            const data = ERC721_CONTRACT_INTERFACE.encodeTransactionData(nftAddress, "mint", [await wallet1.getAddress(), nftId])
            data.chain = chain
            await auth.sendTx(data)
        })

        describe("Write functions - Basic Functionality", () => {
            it("transfer", async () => {
                const nft = new NFT(nftAddress)
                const bal = await nft.getBalance(await wallet1.getAddress())
                try {
                    await wallet1.transfer(auth, {
                        to: await wallet2.getAddress(),
                        token: nftAddress,
                        tokenId: nftId
                    })
                } catch (error) {
                    assert(
                        false,
                        `Transfer from wallet1 ${await wallet1.getAddress()} to 
                        wallet2 ${await wallet2.getAddress()} should have succeeded
                        but failed with error ${error}`
                    )
                }
                const bal1 = await nft.getBalance(await wallet1.getAddress())
                console.log("first transfer", bal1, bal)

                try {
                    await wallet2.transfer(auth, {
                        to: await wallet1.getAddress(),
                        token: nftAddress,
                        tokenId: nftId
                    })
                } catch (error) {
                    assert(
                        false,
                        `Transfer from wallet2 ${await wallet2.getAddress()} to 
                        wallet1 ${await wallet1.getAddress()} should have succeeded
                        but failed with error ${error}`
                    )
                }
                const bal2 = await nft.getBalance(await wallet1.getAddress())
                console.log("second transfer", bal2, bal1)
            })

            it("transfer", async () => {
                const nft = new NFT(nftAddress)
                const bal = await nft.getBalance(await wallet1.getAddress())
                try {
                    await wallet1.transferERC721(auth, {
                        to: await wallet2.getAddress(),
                        token: nftAddress,
                        tokenId: nftId
                    })
                } catch (error) {
                    assert(
                        false,
                        `Transfer from wallet1 ${await wallet1.getAddress()} to 
                        wallet2 ${await wallet2.getAddress()} should have succeeded
                        but failed with error ${error}`
                    )
                }
                const bal1 = await nft.getBalance(await wallet1.getAddress())
                console.log("first transfer", bal1, bal)

                try {
                    await wallet2.transferERC721(auth, {
                        to: await wallet1.getAddress(),
                        token: nftAddress,
                        tokenId: nftId
                    })
                } catch (error) {
                    assert(
                        false,
                        `Transfer from wallet2 ${await wallet2.getAddress()} to 
                        wallet1 ${await wallet1.getAddress()} should have succeeded
                        but failed with error ${error}`
                    )
                }
                const bal2 = await nft.getBalance(await wallet1.getAddress())
                console.log("second transfer", bal2, bal1)
            })

            it("approve", async () => {
                const nft = new NFT(nftAddress)
                await wallet1.approve(auth, {
                    spender: await wallet2.getAddress(),
                    token: nftAddress,
                    tokenId: nftId
                })

                const data = await nft.getApproved(nftId.toString())
                assert(data === (await wallet2.getAddress()), "Wallet 2 did not receive")
            })

            it("approve", async () => {
                const nft = new NFT(nftAddress)
                await wallet1.approveERC721(auth, {
                    spender: await wallet2.getAddress(),
                    token: nftAddress,
                    tokenId: nftId
                })

                const data = await nft.getApproved(nftId.toString())
                assert(data === (await wallet2.getAddress()), "Wallet 2 did not receive")
            })
        })

        describe("Read functions - Basic Functionality", () => {
            it("getAddress", async () => {
                const nft = new NFT(nftAddress)
                await nft.getAddress()
                assert(nft.address === nftAddress, "Address is not correct")
            })

            it("getBalance", async () => {
                const nft = new NFT(nftAddress)
                const bal = await nft.getBalance(await wallet1.getAddress())
                assert(bal.toString() >= "1", "Balance is not correct")
            })

            it("getApproval", async () => {
                const nft = new NFT(nftAddress)
                const tokenId = nftId.toString()
                const approved = await nft.getApproved(tokenId)
                const owner = await wallet2.getAddress()
                assert(approved === owner, "Owner is not correct")
            })

            it("getName", async () => {
                const options: GlobalEnvOption = {
                    chain: "1",
                    apiKey: apiKey
                }
                await configureEnvironment(options)
                const nft = new NFT(config.testNFTAddress)
                const nftName = await nft.getName()
                assert(nftName === config.testNFTName, "Incorrect NFT Name")
            })

            it("getAddress", async () => {
                const options: GlobalEnvOption = {
                    chain: "1",
                    apiKey: apiKey
                }
                await configureEnvironment(options)
                const nft = new NFT(config.testNFTName)
                const nftAddr = await nft.getAddress()
                assert(nftAddr === config.testNFTAddress, "Incorrect NFT Address")
            })
        })
    })
}
