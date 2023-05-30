import { assert } from "chai"
import { Auth, Eoa } from "../../src/auth"
import { GlobalEnvOption, configureEnvironment } from "../../src/config"
import { fundWallet } from "../../src/utils"
import { FunWallet } from "../../src/wallet"
import { getTestApiKey } from "../testUtils"
import { NFT } from '../../src/data/NFT';

export interface NFTTestConfig {
  chainId: number
  authPrivateKey: string
  baseToken: string
  prefund: boolean
  nftAddress: string
}

export const NFTTest = (config: NFTTestConfig) => {
  const { chainId, authPrivateKey, baseToken, prefund } = config

  describe("NFT Tests", function () {
    this.timeout(120_000)
    let auth: Auth
    let wallet: FunWallet
    const amount = 0.001
    before(async function () {
      let apiKey = await getTestApiKey()
      const options: GlobalEnvOption = {
        chain: chainId.toString(),
        apiKey: apiKey
      }
      await configureEnvironment(options)
      auth = new Eoa({ privateKey: authPrivateKey })
      wallet = new FunWallet({ uniqueId: await auth.getUniqueId(), index: 1792811340 })
      if (prefund) await fundWallet(auth, wallet, 0.002)
    })

    describe("Write functions - Basic Functionality", () => {
      it("setApprovalForAll", async () => {
        const nft = new NFT(config.nftAddress)
        const spender = await wallet.getAddress()
        const data = await nft.approveForAll(spender)
      })
      it("revokeApprovalForAll", async () => {
        const nft = new NFT(config.nftAddress)
        const spender = await wallet.getAddress()
        const data = await nft.revokeForAll(spender)
      })
      it("transfer", async () => {
        const nft = new NFT(config.nftAddress)
        const spender = await wallet.getAddress()
        const data = await nft.transfer(spender, 1)
      })
      it("approve", async () => {
        const nft = new NFT(config.nftAddress)
        const spender = await wallet.getAddress()
        const data = await nft.approve(spender, 1)
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
        await nft.getContract()
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
