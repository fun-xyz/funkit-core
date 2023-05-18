const { WALLET_PRIVATE_KEY } = require("../../utils/index.js")

const PREFUND = process.env.PREFUND === 'true' ? true : false
const config = {
  chainId: 5, // Doesn't matter for this test
  authPrivateKey: WALLET_PRIVATE_KEY,
  inToken: "dai", // Doesn't matter for this test
  outToken: "weth",
  baseToken: "eth",
  prefund: PREFUND
}

const { chainId, authPrivateKey, inToken, outToken, baseToken, prefund } = config
const { expect } = require("chai")
const { Eoa } = require("../../auth")
const { configureEnvironment } = require("../../managers")
const { FunWallet } = require("../../wallet")
const chai = require('chai')
const { fundWallet, getTestApiKey } = require("../../utils")
const { BigNumber } = require("@ethersproject/bignumber")
chai.use(require('chai-json-schema'))

describe("GetAssets", function () {
  this.timeout(120_000)
  let auth
  let wallet
  before(async function () {
    let apiKey = await getTestApiKey()
    const options = {
      chain: chainId,
      apiKey: apiKey,
      gasSponsor: null,
    }
    await configureEnvironment(options)
    auth = new Eoa({ privateKey: authPrivateKey })
    uniqueId = await auth.getUniqueId()

    wallet = new FunWallet({ uniqueId, index: 14142 })
  })

  describe("/get-tokens", () => {
    // describe("Negative Unit Tests - Input validation errors", () => {
    //     it("Unsupported Network, chain id must be 1, 5, 10, 56, 137, 42161", async () => {
    //         const res = await wallet.getTokens(2)
    //         expect(res.success).to.be.equal(false)
    //         expect(res.message).to.equal('Invalid chain id, must be 1, 5, 10, 56, 137, 42161')
    //     })

    //     it("Invalid Address", async () => {
    //         const res = await wallet.getTokens(1, '0x123')
    //         expect(res.success).to.be.equal(false)
    //         expect(res.message).to.equal('Invalid address')
    //     })

    //     it("Invalid onlyVerifiedTokens - must be true or false", async () => {
    //         const res = await wallet.getTokens(1, "0x4675C7e5BaAFBFFbca748158bEcBA61ef3b0a263", "nottrueorfalse")
    //         expect(res.success).to.be.equal(false)
    //         expect(res.message).to.equal(`Invalid onlyVerifiedTokens, must be "true" or "false"`)
    //     })
    // })

    describe("Positive Unit Tests", () => {
      // it("Goerli, Funwallet", async () => {
      //     const res = await wallet.getTokens(5)
      //     expect(Object.values(res)[0].tokenBalance).to.not.be.empty
      //     expect(BigNumber.from(Math.floor(Object.values(res)[0].price)).gte(500)).to.be.true
      // })

      it("Mainnet, Binance 8", async () => {
        const res = await wallet.getTokens("true")
        console.log(res)
        expect(BigNumber.from(Object.values(res)[0].tokenBalance).gte(BigNumber.from(1))).to.be.true
        expect(BigNumber.from(Math.ceil(Object.values(res)[0].price)).gt(0)).to.be.true
        expect(BigNumber.from(Object.values(res)[0].decimals).gte(6)).to.be.true
        expect(Object.values(res)[0].symbol).to.not.be.empty
        expect(Object.values(res)[0].logo).to.not.be.empty
      })

      // it("Optimism, Optimism Foundation", async () => {
      //     const res = await wallet.getTokens(10, "0xc5451b523d5FFfe1351337a221688a62806ad91a", "true")
      //     expect(BigNumber.from(Object.values(res)[0].tokenBalance).gte(BigNumber.from(0))).to.be.true
      //     expect(BigNumber.from(Math.ceil(Object.values(res)[0].price)).gt(0)).to.be.true
      // })

      // it("Polygon, Quickswap Team", async () => {
      //     const res = await wallet.getTokens(137, "0x958d208cdf087843e9ad98d23823d32e17d723a1", "true")
      //     expect(BigNumber.from(Object.values(res)[0].tokenBalance).gte(BigNumber.from(0))).to.be.true
      //     expect(BigNumber.from(Math.ceil(Object.values(res)[0].price)).gt(0)).to.be.true
      //     expect(BigNumber.from(Object.values(res)[0].decimals).gte(6)).to.be.true
      //     expect(Object.values(res)[0].symbol).to.not.be.empty
      //     expect(Object.values(res)[0].logo).to.not.be.empty
      // })

      // it("Arbitrum, ARB market maker", async () => {
      //     const res = await wallet.getTokens(42161, "0x1E7016f7C23859d097668C27B72C170eD7129A10", "true")
      //     expect(BigNumber.from(Object.values(res)[0].tokenBalance).gte(BigNumber.from(0))).to.be.true
      //     expect(BigNumber.from(Math.ceil(Object.values(res)[0].price)).gt(0)).to.be.true
      //     expect(BigNumber.from(Object.values(res)[0].decimals).gte(6)).to.be.true
      //     expect(Object.values(res)[0].symbol).to.not.be.empty
      //     expect(Object.values(res)[0].logo).to.not.be.empty
      // })
    })
  })

  describe("/get-nfts", () => {
    const getNFTsSchema = {
      "address": {
        type: "string",
      },
      token_id: {
        type: "string",
      },
      floor_price: {
        type: "number",
        minimum: 0
      }
    }
    // describe("Negative Unit Tests - Input validation errors", () => {
    //     it("Unsupported Network, chain id must be 1, 5, 10, 56, 137, 42161", async () => {
    //         const res = await wallet.getNFTs(2)
    //         expect(res.success).to.be.equal(false)
    //         expect(res.message).to.equal('Invalid chain id, must be 1, 5, 10, 56, 137, 42161')
    //     })

    //     it("Invalid Address", async () => {
    //         const res = await wallet.getNFTs(1, '0x123')
    //         expect(res.success).to.be.equal(false)
    //         expect(res.message).to.equal('Invalid address')
    //     })
    // })

    describe("Positive Unit Tests", () => {
      // it("Goerli, Funwallet", async () => {
      //     const res = await wallet.getNFTs(5)
      //     expect(res.length).to.equal(0)
      // })

      it("Mainnet, Franklinisbored.eth", async () => {
        const res = await wallet.getNFTs()
        console.log(res)
        expect(res.length).to.be.gte(1)
        expect(res[0]).to.be.jsonSchema(getNFTsSchema)
      })

      // it("Optimism, Uniswap Positions", async () => {
      //     const res = await wallet.getNFTs(10, "0x9d6619244faf7fA208e11952a22f29B571b6Bf64")
      //     expect(res.length).to.be.gte(1)
      //     expect(res[0]).to.be.jsonSchema(getNFTsSchema)
      // })

      // it("Polygon, Uniswap Positions", async () => {
      //     const res = await wallet.getNFTs(137, "0xFB3B1CEE918648DfF3156FAb2900844f781773c4")
      //     expect(res.length).to.be.gte(1)
      //     expect(res[0]).to.be.jsonSchema(getNFTsSchema)
      // })

      // it("Arbitrum, Arbitrum Odyssey", async () => {
      //     const res = await wallet.getNFTs(42161, "0xCE1a11c0f641c7219B19BFb5e1Cb5900F27ff92c")
      //     expect(res.length).to.be.gte(1)
      //     expect(res[0]).to.be.jsonSchema(getNFTsSchema)
      // })
    })
  })

  // describe("getAllTokens()", () => {
  //     describe("Positive Tests", () => {
  //         it("Sanity Test", async () => {
  //             const res = await wallet.getAllTokens("0x4675C7e5BaAFBFFbca748158bEcBA61ef3b0a263")
  //             expect(Object.keys(res).length).to.be.gte(1)
  //         })
  //         it("Random Whale", async () => {
  //             const res = await wallet.getAllTokens("0xd8db5a6d2448ab29165332eb514a716b3ed8b0b9")
  //             expect(Object.keys(res).length).to.be.gte(1)
  //         })
  //     })
  // })

  // describe("getAllNFTs()", () => {
  //     describe("Positive Tests", () => {
  //         it("Sanity Test", async () => {
  //             const res = await wallet.getAllNFTs("0x4675C7e5BaAFBFFbca748158bEcBA61ef3b0a263")
  //             expect(Object.keys(res).length).to.be.gte(1)
  //         })

  //         it("Random Whale - n0b0dy.eth", async () => {
  //             const res = await wallet.getAllNFTs("0x7eb413211a9DE1cd2FE8b8Bb6055636c43F7d206")
  //             expect(Object.keys(res).length).to.be.gte(1)
  //         })
  //     })
  // })
})