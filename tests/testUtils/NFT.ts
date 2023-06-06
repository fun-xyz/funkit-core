import { assert } from "chai"
import { Auth, Eoa } from "../../src/auth"
import { GlobalEnvOption, configureEnvironment } from "../../src/config"
import { NFT } from "../../src/data/NFT"
import { fundWallet } from "../../src/utils"
import { FunWallet } from "../../src/wallet"
import { getAwsSecret, getTestApiKey } from "../getAWSSecrets"
export interface NFTTestConfig {
    chainId: number
    baseToken: string
    prefund: boolean
    nftAddress: string
}
export const NFTTest = (config: NFTTestConfig) => {
    const { chainId, prefund, nftAddress } = config

    describe("NFT Tests", function () {
        this.timeout(120_000)
        let auth: Auth
        let wallet1: FunWallet
        let wallet2: FunWallet
        let apiKey: string
        before(async function () {
            apiKey = await getTestApiKey()
            const options: GlobalEnvOption = {
                chain: chainId.toString(),
                apiKey: apiKey
            }
            await configureEnvironment(options)
            auth = new Eoa({ privateKey: await getAwsSecret("PrivateKeys", "WALLET_PRIVATE_KEY") })
            wallet1 = new FunWallet({ uniqueId: await auth.getUniqueId(), index: 1792811340 })
            wallet2 = new FunWallet({ uniqueId: await auth.getUniqueId(), index: 1792811341 })
            if (prefund) {
                await fundWallet(auth, wallet1, 0.02)
                await fundWallet(auth, wallet2, 0.02)
            }
        })

        describe("Write functions - Basic Functionality", () => {
            it("transfer", async () => {
                let transferError = false
                try {
                    await wallet1.transfer(auth, {
                        to: await wallet2.getAddress(),
                        token: nftAddress,
                        tokenId: 10
                    })
                } catch (error) {
                    console.log("NFT transfer error: ", error)
                    transferError = true
                }
                await wallet2.transfer(auth, {
                    to: await wallet1.getAddress(),
                    token: nftAddress,
                    tokenId: 10
                })
                assert(!transferError, "Transfer should have failed")
            })

            it("approve", async () => {
                const nft = new NFT(nftAddress)
                await wallet1.approve(auth, {
                    spender: await wallet2.getAddress(),
                    token: nftAddress,
                    tokenId: 10
                })
                const data = await nft.getApproved("10")
                assert(data === (await wallet2.getAddress()), "Wallet 2 did not receive")
            })
        })

        describe("Read functions - Basic Functionality", () => {
            it("getAddress", async () => {
                const nft = new NFT(nftAddress)
                await nft.getAddress()
                assert(nft.address === nftAddress, "Address is not correct")
            })
            it("getContract", async () => {
                const nft = new NFT(nftAddress)
                const nftContract = await nft.getContract()
                assert(nftContract.address === nftAddress, "Contract is not correct")
            })
            it("getBalance", async () => {
                const nft = new NFT(nftAddress)
                const bal = await nft.getBalance(await wallet1.getAddress())
                assert(bal.toString() >= "1", "Balance is not correct")
            })
            it("getApproval", async () => {
                const nft = new NFT(nftAddress)
                const tokenId = "10"
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
                const nftAddr = "0x96fc56721d2b79485692350014875b3b67cb00eb"
                const nft = new NFT(nftAddr)
                const nftName = await nft.getName()
                assert(nftName === "Anatomy Science Ape Club", "Incorrect NFT Name")
            })

            it("getAddress", async () => {
                const options: GlobalEnvOption = {
                    chain: "1",
                    apiKey: apiKey
                }
                const nftName = "Anatomy Science Ape Club"
                await configureEnvironment(options)
                const nft = new NFT(nftName)
                const nftAddr = await nft.getAddress()
                assert(nftAddr === "0x96fc56721d2b79485692350014875b3b67cb00eb", "Incorrect NFT Address")
            })
        })
    })
}
