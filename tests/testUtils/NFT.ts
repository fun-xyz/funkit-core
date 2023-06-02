import { assert } from "chai"
import { Auth, Eoa } from "../../src/auth"
import { GlobalEnvOption, configureEnvironment } from "../../src/config"
import { NFT } from "../../src/data/NFT"
import { fundWallet } from "../../src/utils"
import { FunWallet } from "../../src/wallet"
import { getTestApiKey } from "../getTestApiKey"
export interface NFTTestConfig {
    chainId: number
    authPrivateKey: string
    baseToken: string
    prefund: boolean
    nftAddress: string
}
export const NFTTest = (config: NFTTestConfig) => {
    const { chainId, authPrivateKey, prefund, nftAddress } = config

    describe("NFT Tests", function () {
        this.timeout(120_000)
        let auth: Auth
        let wallet1: FunWallet
        let wallet2: FunWallet
        before(async function () {
            const apiKey = await getTestApiKey()
            const options: GlobalEnvOption = {
                chain: chainId.toString(),
                apiKey: apiKey
            }
            await configureEnvironment(options)
            auth = new Eoa({ privateKey: authPrivateKey })
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
                        tokenId: 3
                    })
                } catch (error) {
                    transferError = true
                }
                assert(transferError, "Transfer should have failed")
                await wallet2.transfer(auth, {
                    to: await wallet1.getAddress(),
                    token: nftAddress,
                    tokenId: 3
                })

                await wallet1.transfer(auth, {
                    to: await wallet2.getAddress(),
                    token: nftAddress,
                    tokenId: 3
                })
            })

            it("approve", async () => {
                const nft = new NFT(nftAddress)
                await wallet1.approve(auth, {
                    spender: await wallet2.getAddress(),
                    token: nftAddress,
                    tokenId: 2
                })
                const data = await nft.getApproved("2")
                assert(data === (await wallet2.getAddress()), "Wallet 2 did not receiveis not correct")
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
                assert(bal.toString() === "1", "Balance is not correct")
            })
            it("getApproval", async () => {
                const nft = new NFT(nftAddress)
                const tokenId = "2"
                const approved = await nft.getApproved(tokenId)
                const owner = await wallet2.getAddress()
                assert(approved === owner, "Owner is not correct")
            })
        })
    })
}
