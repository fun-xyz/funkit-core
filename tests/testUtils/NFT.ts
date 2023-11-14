import { assert } from "chai"
import { Address } from "viem"
import { Auth } from "../../src/auth"
import { ERC721_CONTRACT_INTERFACE } from "../../src/common"
import { GlobalEnvOption, configureEnvironment } from "../../src/config"
import { Chain, Token } from "../../src/data"
import { NFT } from "../../src/data/NFT"
import { FunKit } from "../../src/FunKit"
import { fundWallet } from "../../src/utils"
import { FunWallet } from "../../src/wallet"
import { getAwsSecret, getTestApiKey } from "../getAWSSecrets"
import "../../fetch-polyfill"
export interface NFTTestConfig {
    chainId: number
    baseToken: string
    tokenId: number
    testNFTName: string
    testNFTAddress: string
    prefundAmt: number
    numRetry?: number
}
export const NFTTest = (config: NFTTestConfig) => {
    const { baseToken, prefundAmt } = config
    let nftAddress: Address

    describe("NFT Tests", function () {
        this.retries(config.numRetry ? config.numRetry : 0)
        this.timeout(300_000_000)
        let auth: Auth
        let wallet1: FunWallet
        let wallet2: FunWallet
        let apiKey: string
        let nftId: number
        let chain: Chain
        let fun: FunKit
        let baseTokenObj1: Token
        let baseTokenObj2: Token
        let options: GlobalEnvOption

        before(async function () {
            apiKey = await getTestApiKey()
            options = {
                chain: config.chainId,
                apiKey: apiKey,
                gasSponsor: {}
            }
            fun = new FunKit(options)
            auth = fun.getAuth({ privateKey: await getAwsSecret("PrivateKeys", "WALLET_PRIVATE_KEY") })
            const users = [{ userId: await auth.getAddress() }]
            const uniqueId1 = await auth.getWalletUniqueId(1792811340)
            const uniqueId2 = await auth.getWalletUniqueId(1792811341)

            wallet1 = await fun.createWalletWithUsersAndId(users, uniqueId1)
            wallet2 = await fun.createWalletWithUsersAndId(users, uniqueId2)

            if (!(await wallet1.getDeploymentStatus())) {
                await fundWallet(auth, wallet1, prefundAmt ? prefundAmt : 0.2)
            }
            chain = await fun.getChain(options.chain)
            baseTokenObj1 = wallet1.getToken(baseToken)
            if (Number(await baseTokenObj1.getBalance()) < prefundAmt) {
                await fundWallet(auth, wallet1, prefundAmt ? prefundAmt : 0.1)
            }

            if (!(await wallet2.getDeploymentStatus())) {
                await fundWallet(auth, wallet2, prefundAmt ? prefundAmt : 0.2)
            }
            baseTokenObj2 = wallet2.getToken(baseToken)
            if (Number(await baseTokenObj2.getBalance()) < prefundAmt) {
                await fundWallet(auth, wallet2, prefundAmt ? prefundAmt : 0.1)
            }
            nftId = Math.floor(Math.random() * 10_000_000_000)
            nftAddress = await chain.getAddress("TestNFT")
            const data = ERC721_CONTRACT_INTERFACE.encodeTransactionParams(nftAddress, "mint", [await wallet1.getAddress(), nftId])
            await auth.sendTx({ ...data }, chain)
        })

        describe("Write functions - Basic Functionality", () => {
            it("approve", async () => {
                const nft = new NFT(nftAddress, options)
                const userOp = await wallet1.tokenApprove(auth, await auth.getAddress(), {
                    spender: await wallet2.getAddress(),
                    collection: nftAddress,
                    tokenId: nftId
                })
                await wallet1.executeOperation(auth, userOp)

                if (config.chainId === 1) {
                    await new Promise((r) => setTimeout(r, 10000))
                }
                const data = await nft.getApproved(nftId.toString())
                assert(data === (await wallet2.getAddress()), "Wallet 2 did not receive")
            })

            it("getApproval", async () => {
                const nft = new NFT(nftAddress, options)
                const tokenId = nftId.toString()
                const approved = await nft.getApproved(tokenId)
                const owner = await wallet2.getAddress()
                assert(approved === owner, "Owner is not correct")
            })

            it("transfer", async () => {
                const nft = new NFT(nftAddress, options)
                const bal = await nft.getBalance(await wallet1.getAddress())
                try {
                    const userOp = await wallet1.transfer(auth, await auth.getAddress(), {
                        to: await wallet2.getAddress(),
                        collection: nftAddress,
                        tokenId: nftId,
                        from: await wallet1.getAddress()
                    })
                    await wallet1.executeOperation(auth, userOp)
                } catch (error) {
                    assert(
                        false,
                        `Transfer from wallet1 ${await wallet1.getAddress()} to
                        wallet2 ${await wallet2.getAddress()} should have succeeded
                        but failed with error ${error}`
                    )
                }
                if (config.chainId === 1) {
                    await new Promise((r) => setTimeout(r, 15000))
                }
                const bal1 = await nft.getBalance(await wallet1.getAddress())
                assert(bal > bal1, "First nft transfer did not succeed")

                try {
                    const userOp = await wallet2.transfer(auth, await auth.getAddress(), {
                        to: await wallet1.getAddress(),
                        collection: nftAddress,
                        tokenId: nftId,
                        from: await wallet2.getAddress()
                    })
                    await wallet2.executeOperation(auth, userOp)
                } catch (error) {
                    assert(
                        false,
                        `Transfer from wallet2 ${await wallet2.getAddress()} to
                        wallet1 ${await wallet1.getAddress()} should have succeeded
                        but failed with error ${error}`
                    )
                }
                if (config.chainId === 1) {
                    await new Promise((r) => setTimeout(r, 15000))
                }
                const bal2 = await nft.getBalance(await wallet1.getAddress())
                assert(bal2 > bal1, "Second nft transfer did not succeed")
            })
        })

        describe("Read functions - Basic Functionality", () => {
            it("getAddress", async () => {
                const nft = new NFT(nftAddress, options)
                await nft.getAddress()
                assert(nft.address === nftAddress, "Address is not correct")
            })

            it("getBalance", async () => {
                const nft = new NFT(nftAddress, options)
                const bal = await nft.getBalance(await wallet1.getAddress())
                assert(bal.toString() >= "1", "Balance is not correct")
            })

            it("getName", async () => {
                const options: GlobalEnvOption = {
                    chain: "1",
                    apiKey: apiKey,
                    gasSponsor: {}
                }
                await configureEnvironment(options)
                const nft = new NFT(config.testNFTAddress, options)
                const nftName = await nft.getName()
                assert(nftName === config.testNFTName, "Incorrect NFT Name")
            })

            it("getAddress", async () => {
                const options: GlobalEnvOption = {
                    chain: "1",
                    apiKey: apiKey,
                    gasSponsor: {}
                }
                await configureEnvironment(options)
                const nft = new NFT(config.testNFTName, options)
                const nftAddr = await nft.getAddress()
                assert(nftAddr === config.testNFTAddress, "Incorrect NFT Address")
            })
        })
    })
}
