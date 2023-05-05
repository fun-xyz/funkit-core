const GetAssetsTest = (config) => {
    const { chainId, authPrivateKey, inToken, outToken, baseToken, prefund } = config
    const { expect } = require("chai")
    const { Eoa } = require("../../auth")
    const { Token } = require("../../data")
    const { configureEnvironment } = require("../../managers")
    const { FunWallet } = require("../../wallet")
    const { fundWallet, getTestApiKey } = require("../../utils")

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
            describe("Negative Tests - Input validation errors", () => {
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

            describe("Positive Tests", () => {
                it("Goerli, Funwallet", async () => {
                    const walletAddress = await wallet.getAddress()
                })

                it("Mainnet, Jump Crypto", async () => {
                    const walletAddress = await wallet.getAddress()
                })

                it("Optimism, Vitalik.eth", async () => {
                    const walletAddress = await wallet.getAddress()
                })

                it("Polygon, Vitalik.eth", async () => {
                    const walletAddress = await wallet.getAddress()
                })

                it("Arbitrum, Vitalik.eth", async () => {
                    const walletAddress = await wallet.getAddress()
                })
            })
        })

        describe("/get-nfts", () => {
            describe("Negative Tests - Input validation errors", () => {
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

            describe("Positive Tests", () => {
                it("Goerli, Funwallet", async () => {
                    const walletAddress = await wallet.getAddress()
                })

                it("Mainnet, Jump Crypto", async () => {
                    const walletAddress = await wallet.getAddress()
                })

                it("Optimism, Vitalik.eth", async () => {
                    const walletAddress = await wallet.getAddress()
                })

                it("Polygon, Vitalik.eth", async () => {
                    const walletAddress = await wallet.getAddress()
                })

                it("Arbitrum, Vitalik.eth", async () => {
                    const walletAddress = await wallet.getAddress()
                })
            })
        })
        

    })
}

module.exports = { GetAssetsTest }