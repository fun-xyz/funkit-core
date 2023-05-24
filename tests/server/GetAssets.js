const { WALLET_PRIVATE_KEY } = require("../../utils/index.js")

const config = {
  chainId: 5, // Doesn't matter for this test
  authPrivateKey: WALLET_PRIVATE_KEY
}

const { chainId, authPrivateKey } = config
const { expect } = require("chai")
const { Eoa } = require("../../auth")
const { configureEnvironment } = require("../../managers")
const { FunWallet } = require("../../wallet")
const { getTestApiKey } = require("../../utils")
const { BigNumber } = require("@ethersproject/bignumber")

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
    describe("Negative Unit Tests - Input validation errors", () => {
      it("Invalid onlyVerifiedTokens - must be true or false", async () => {
        const res = await wallet.getTokens("nottrueorfalse")
        expect(res.success).to.be.equal(false)
        expect(res.message).to.equal(`Invalid onlyVerifiedTokens, must be "true" or "false"`)
      })
    })

    describe("Positive Unit Tests", () => {
      it("Goerli, Funwallet", async () => {
        const res = await wallet.getTokens("true")
        expect(BigNumber.from(Math.floor(Object.values(res)[0].price)).gte(500)).to.be.true
      })

      it("Mainnet, Binance 8", async () => {
        let apiKey = await getTestApiKey()
        const options = {
          chain: 1,
          apiKey: apiKey,
          gasSponsor: null,
        }
        await configureEnvironment(options)
        const res = await wallet.getTokens("true")
        expect(BigNumber.from(Math.ceil(Object.values(res)[0].price)).gt(0)).to.be.true
      })

      it("Optimism, Optimism Foundation", async () => {
        let apiKey = await getTestApiKey()
        const options = {
          chain: 10,
          apiKey: apiKey,
          gasSponsor: null,
        }
        await configureEnvironment(options)
        const res = await wallet.getTokens("true")
        expect(BigNumber.from(Object.values(res)[0].tokenBalance).gte(BigNumber.from(0))).to.be.true
        expect(BigNumber.from(Math.ceil(Object.values(res)[0].price)).gt(0)).to.be.true
      })

      it("Polygon, Quickswap Team", async () => {
        let apiKey = await getTestApiKey()
        const options = {
          chain: 137,
          apiKey: apiKey,
          gasSponsor: null,
        }
        await configureEnvironment(options)
        const res = await wallet.getTokens("true")
        expect(BigNumber.from(Object.values(res)[0].tokenBalance).gte(BigNumber.from(0))).to.be.true
      })

      it("Arbitrum", async () => {
        let apiKey = await getTestApiKey()
        const options = {
          chain: 42161,
          apiKey: apiKey,
          gasSponsor: null,
        }
        await configureEnvironment(options)
        const res = await wallet.getTokens("true")
        expect(BigNumber.from(Object.values(res)[0].tokenBalance).gte(BigNumber.from(0))).to.be.true
        expect(BigNumber.from(Math.ceil(Object.values(res)[0].price)).gt(0)).to.be.true
      })
    })
  })

  describe("/get-nfts", () => {
    describe("Positive Unit Tests", () => {
      it("Goerli, Funwallet", async () => {
        let apiKey = await getTestApiKey()
        const options = {
          chain: 5,
          apiKey: apiKey,
          gasSponsor: null,
        }
        await configureEnvironment(options)
        const res = await wallet.getNFTs(5)
        expect(res.length).to.equal(0)
      })

      it("Mainnet, Franklinisbored.eth", async () => {
        let apiKey = await getTestApiKey()
        const options = {
          chain: 1,
          apiKey: apiKey,
          gasSponsor: null,
        }
        await configureEnvironment(options)
        const res = await wallet.getNFTs()
        expect(res.length).to.equal(0)
      })

      it("Optimism, Uniswap Positions", async () => {
        let apiKey = await getTestApiKey()
        const options = {
          chain: 10,
          apiKey: apiKey,
          gasSponsor: null,
        }
        await configureEnvironment(options)
        const res = await wallet.getNFTs()
        expect(res.length).to.equal(0)
      })

      it("Polygon, Uniswap Positions", async () => {
        let apiKey = await getTestApiKey()
        const options = {
          chain: 137,
          apiKey: apiKey,
          gasSponsor: null,
        }
        await configureEnvironment(options)
        const res = await wallet.getNFTs()
        expect(res.length).to.equal(0)
      })

      it("Arbitrum, Arbitrum Odyssey", async () => {
        let apiKey = await getTestApiKey()
        const options = {
          chain: 42161,
          apiKey: apiKey,
          gasSponsor: null,
        }
        await configureEnvironment(options)
        const res = await wallet.getNFTs()
        expect(res.length).to.equal(0)
      })
    })
  })

  describe("getAllTokens()", () => {
    describe("Positive Tests", () => {
      it("Sanity Test", async () => {
        const res = await wallet.getAllTokens()
        expect(Object.keys(res).length).to.be.gte(1)
      })
    })
  })

  describe("getAllNFTs()", () => {
    describe("Positive Tests", () => {
      it("Sanity Test", async () => {
        const res = await wallet.getAllNFTs()
        expect(Object.keys(res).length).to.be.gte(1)
      })
    })
  })

  describe("getAssets()", () => {
    describe("Positive Tests", () => {
      it("Sanity Test", async () => {
        const res = await wallet.getAssets()
        expect(Object.keys(res).length).to.be.gte(1)
      })
    })
  })
})