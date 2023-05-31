import { assert } from "chai"
import { Auth, Eoa } from "../../src/auth"
import { GlobalEnvOption, configureEnvironment } from "../../src/config"
import { fundWallet } from "../../src/utils"
import { FunWallet } from "../../src/wallet"
import { getTestApiKey } from "../testUtils"
import { NFT } from "../../src/data/NFT"
import { Contract, ethers } from "ethers"
import erc721_abi from "../../src/abis/ERC721.json"
import { Chain } from "../../src/data"
export interface NFTTestConfig {
    chainId: number
    authPrivateKey: string
    baseToken: string
    prefund: boolean
    nftAddress: string
}
export const NFTTest = (config: NFTTestConfig) => {
    const { chainId, authPrivateKey, prefund, nftAddress } = config
    let NFTContract: Contract

    describe("NFT Tests", function () {
        this.timeout(120_000)
        let auth: Auth
        let wallet: FunWallet
        before(async function () {
            const apiKey = await getTestApiKey()
            const options: GlobalEnvOption = {
                chain: chainId.toString(),
                apiKey: apiKey
            }
            await configureEnvironment(options)
            auth = new Eoa({ privateKey: authPrivateKey })
            wallet = new FunWallet({ uniqueId: await auth.getUniqueId(), index: 1792811340 })
            if (prefund) await fundWallet(auth, wallet, 0.002)
            const chain = new Chain({ chainId: chainId.toString() })
            NFTContract = new ethers.Contract(nftAddress, erc721_abi, await chain.getProvider())
        })

        describe("Write functions - Basic Functionality", () => {
            it("setApprovalForAll", async () => {
                const nft = new NFT(config.nftAddress)
                const spender = await wallet.getAddress()
                const data = await nft.approveForAll(spender)
                const expectedData = await NFTContract.populateTransaction.setApprovalForAll(spender, true)
                assert(data.data.data === expectedData.data, "Data is not correct")
                assert(data.data.to === expectedData.to, "Address is not correct")
            })
            it("revokeApprovalForAll", async () => {
                const nft = new NFT(config.nftAddress)
                const spender = await wallet.getAddress()
                const data = await nft.revokeForAll(spender)
                const expectedData = await NFTContract.populateTransaction.setApprovalForAll(spender, false)
                assert(data.data.data === expectedData.data, "Data is not correct")
                assert(data.data.to === expectedData.to, "Address is not correct")
            })
            it("transfer", async () => {
                const nft = new NFT(config.nftAddress)
                const spender = await wallet.getAddress()
                const data = await nft.transfer(spender, ethers.constants.AddressZero, 1)
                const expectedData = await NFTContract.populateTransaction.transferFrom(spender, ethers.constants.AddressZero, 1)
                assert(data.data.data === expectedData.data, "Data is not correct")
                assert(data.data.to === expectedData.to, "Address is not correct")
            })
            it("approve", async () => {
                const nft = new NFT(config.nftAddress)
                const spender = await wallet.getAddress()
                const data = await nft.approve(spender, 1)
                const expectedData = await NFTContract.populateTransaction.approve(spender, 1)
                assert(data.data.data === expectedData.data, "Data is not correct")
                assert(data.data.to === expectedData.to, "Address is not correct")
            })
        })

        describe("Read functions - Basic Functionality", () => {
            it("getAddress", async () => {
                const nft = new NFT(config.nftAddress)
                await nft.getAddress()
                assert(nft.address === config.nftAddress, "Address is not correct")
            })
            it("getContract", async () => {
                const nft = new NFT(config.nftAddress)
                const nftContract = await nft.getContract()
                assert(nftContract.address === "0xdFb5778fDbD15d8cb0e37d278CcC2ba9751aa5fc", "Contract is not correct")
            })
            it("getBalance", async () => {
                const nft = new NFT(config.nftAddress)
                const bal = await nft.getBalance(await wallet.getAddress())
                assert(bal.toString() === "2", "Balance is not correct")
            })
            it("getApproval", async () => {
                const nft = new NFT(config.nftAddress)
                const tokenId = "3"
                const approved = await nft.getApproved(tokenId)
                const owner = await wallet.getAddress()
                assert(approved === owner, "Owner is not correct")
            })
        })
    })
}
