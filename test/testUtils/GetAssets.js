const GetAssetsTest = (config) => {
    const { chainId, authPrivateKey, inToken, outToken, baseToken, prefund } = config
    const { expect } = require("chai")
    const { Eoa } = require("../../auth")
    const { Token } = require("../../data")
    const { configureEnvironment } = require("../../managers")
    const { FunWallet } = require("../../wallet")
    const chai = require('chai')
    const { fundWallet, getTestApiKey } = require("../../utils")
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
            if (prefund) {
                await fundWallet(auth, wallet, .5)
            }
        })

        describe("/get-tokens", () => {
            describe("Negative Unit Tests - Input validation errors", () => {
                it("Unsupported Network, chain id must be 1, 5, 10, 56, 137, 42161", async () => {
                    const res = await wallet.getTokens(2)
                    expect(res.success).to.be.equal(false)
                    expect(res.message).to.equal('Invalid chain id, must be 1, 5, 10, 56, 137, 42161')
                })

                it("Invalid Address", async () => {
                    const res = await wallet.getTokens(1, '0x123')
                    expect(res.success).to.be.equal(false)
                    expect(res.message).to.equal('Invalid address')
                })

                it("Invalid onlyVerifiedTokens - must be true or false", async () => {
                    const res = await wallet.getTokens(1, "0x4675C7e5BaAFBFFbca748158bEcBA61ef3b0a263", "nottrueorfalse")
                    expect(res.success).to.be.equal(false)
                    expect(res.message).to.equal(`Invalid onlyVerifiedTokens, must be "true" or "false"`)
                })
            })

            describe("Positive Unit Tests", () => {
                it("Goerli, Funwallet", async () => {
                    const res = await wallet.getTokens(5)
                    expect(Object.keys(res.message).length).to.be.gte(0)
                })

                it("Mainnet, Binance 8", async () => {
                    const res = await wallet.getTokens(1, "0xF977814e90dA44bFA03b6295A0616a897441aceC", "true")
                    expect(Object.keys(res.message)).to.be.gte(1)
                })

                it("Optimism, Optimism Foundation", async () => {
                    const res = await wallet.getTokens(10, "0x2501c477d0a35545a387aa4a3eee4292a9a8b3f0", "true")
                    expect(Object.keys(res.message)).to.be.gte(1)
                })

                it("Polygon, Quickswap Team", async () => {
                    const res = await wallet.getTokens(137, "0x958d208cdf087843e9ad98d23823d32e17d723a1", "true")
                    expect(Object.keys(res.message)).to.be.gte(1)
                })

                it("Arbitrum, ARB market maker", async () => {
                    const res = await wallet.getTokens(42161, "0x1E7016f7C23859d097668C27B72C170eD7129A10", "true")
                    expect(Object.keys(res.message)).to.be.gte(1)
                })
            })
        })

        describe("/get-nfts", () => {
            const getNFTsSchema = {
                "address": {
                    type: "string",
                },
                token_id :{
                    type: "string",
                },
                floor_price: {
                    type: "number",
                    minimum: 0
                }
            }
            describe("Negative Unit Tests - Input validation errors", () => {
                it("Unsupported Network, chain id must be 1, 5, 10, 56, 137, 42161", async () => {
                    const res = await wallet.getNFTs(2)
                    expect(res.success).to.be.equal(false)
                    expect(res.message).to.equal('Invalid chain id, must be 1, 5, 10, 56, 137, 42161')
                })

                it("Invalid Address", async () => {
                    const res = await wallet.getNFTs(1, '0x123')
                    expect(res.success).to.be.equal(false)
                    expect(res.message).to.equal('Invalid address')
                })
            })

            describe("Positive Unit Tests", () => {
                it("Goerli, Funwallet", async () => {
                    const res = await wallet.getNFTs(5)
                    expect(res.length).to.equal(0)
                })

                it("Mainnet, Franklinisbored.eth", async () => {
                    const res = await wallet.getNFTs(1, "0xed2ab4948bA6A909a7751DEc4F34f303eB8c7236")
                    expect(res.length).to.be.gte(1)
                    expect(res[0]).to.be.jsonSchema(getNFTsSchema)
                })

                it("Optimism, Uniswap Positions", async () => {
                    const res = await wallet.getNFTs(10, "0x9d6619244faf7fA208e11952a22f29B571b6Bf64")
                    expect(res.length).to.be.gte(1)
                    expect(res[0]).to.be.jsonSchema(getNFTsSchema)
                })

                it("Polygon, Uniswap Positions", async () => {
                    const res = await wallet.getNFTs(137, "0xFB3B1CEE918648DfF3156FAb2900844f781773c4")
                    expect(res.length).to.be.gte(1)
                    expect(res[0]).to.be.jsonSchema(getNFTsSchema)
                })

                it("Arbitrum, Arbitrum Odessey", async () => {
                    const res = await wallet.getNFTs(42161, "0xCE1a11c0f641c7219B19BFb5e1Cb5900F27ff92c")
                    expect(res.length).to.be.gte(1)
                    expect(res[0]).to.be.jsonSchema(getNFTsSchema)
                })
            })
        })
        

    })
}

module.exports = { GetAssetsTest }