import { BigNumber } from "@ethersproject/bignumber"
import { expect } from "chai"
import { Auth, Eoa } from "../../src/auth"
import { GlobalEnvOption, configureEnvironment } from "../../src/config"
import { Chain } from "../../src/data"
import { FunWallet } from "../../src/wallet"
import { getAwsSecret, getTestApiKey } from "../getAWSSecrets"
const chainId = 5

describe("GetAssets", function () {
    this.timeout(120_000)
    let auth: Auth
    let wallet: FunWallet
    before(async function () {
        const apiKey = await getTestApiKey()
        const options: GlobalEnvOption = {
            chain: new Chain({ chainId: chainId.toString() }),
            apiKey: apiKey
        }
        await configureEnvironment(options)
        auth = new Eoa({ privateKey: await getAwsSecret("PrivateKeys", "WALLET_PRIVATE_KEY") })

        wallet = new FunWallet({ uniqueId: await auth.getUniqueId(), index: 14142 })
    })

    describe("/get-tokens", () => {
        describe("Positive Unit Tests", () => {
            it("Goerli, Funwallet", async () => {
                const res = await wallet.getTokens(true)
                expect(BigNumber.from(Math.floor((Object.values(res) as any)[0].price)).gte(500)).to.be.true
            })

            it("Mainnet, Binance 8", async () => {
                const apiKey = await getTestApiKey()
                const options: GlobalEnvOption = {
                    chain: new Chain({ chainId: "1" }),
                    apiKey: apiKey
                }
                await configureEnvironment(options)
                const res = await wallet.getTokens(true)
                expect(BigNumber.from(Math.ceil((Object.values(res) as any)[0].price)).gt(0)).to.be.true
            })

            it("Optimism, Optimism Foundation", async () => {
                const apiKey = await getTestApiKey()
                const options: GlobalEnvOption = {
                    chain: new Chain({ chainId: "10" }),
                    apiKey: apiKey
                }
                await configureEnvironment(options)
                const res = await wallet.getTokens(true)
                expect(BigNumber.from((Object.values(res) as any)[0].tokenBalance).gte(BigNumber.from(0))).to.be.true
                expect(BigNumber.from(Math.ceil((Object.values(res) as any)[0].price)).gt(0)).to.be.true
            })

            it("Polygon, Quickswap Team", async () => {
                const apiKey = await getTestApiKey()
                const options: GlobalEnvOption = {
                    chain: new Chain({ chainId: "137" }),
                    apiKey: apiKey
                }
                await configureEnvironment(options)
                const res = await wallet.getTokens(true)
                expect(BigNumber.from((Object.values(res) as any)[0].tokenBalance).gte(BigNumber.from(0))).to.be.true
            })

            it("Arbitrum", async () => {
                const apiKey = await getTestApiKey()
                const options: GlobalEnvOption = {
                    chain: new Chain({ chainId: "42161" }),
                    apiKey: apiKey
                }
                await configureEnvironment(options)
                const res = await wallet.getTokens(true)
                expect(BigNumber.from((Object.values(res) as any)[0].tokenBalance).gte(BigNumber.from(0))).to.be.true
                expect(BigNumber.from(Math.ceil((Object.values(res) as any)[0].price)).gt(0)).to.be.true
            })
        })
    })

    describe("/get-nfts", () => {
        describe("Positive Unit Tests", () => {
            it("Goerli, Funwallet", async () => {
                const apiKey = await getTestApiKey()
                const options: GlobalEnvOption = {
                    chain: new Chain({ chainId: "5" }),
                    apiKey: apiKey
                }
                await configureEnvironment(options)
                const res = await wallet.getNFTs()
                expect(res.length).to.equal(0)
            })

            it("Mainnet, Franklinisbored.eth", async () => {
                const apiKey = await getTestApiKey()
                const options: GlobalEnvOption = {
                    chain: new Chain({ chainId: "1" }),
                    apiKey: apiKey
                }
                await configureEnvironment(options)
                const res = await wallet.getNFTs()
                expect(res.length).to.equal(0)
            })

            it("Optimism, Uniswap Positions", async () => {
                const apiKey = await getTestApiKey()
                const options: GlobalEnvOption = {
                    chain: new Chain({ chainId: "10" }),
                    apiKey: apiKey
                }
                await configureEnvironment(options)
                const res = await wallet.getNFTs()
                expect(res.length).to.equal(0)
            })

            it("Polygon, Uniswap Positions", async () => {
                const apiKey = await getTestApiKey()
                const options: GlobalEnvOption = {
                    chain: new Chain({ chainId: "137" }),
                    apiKey: apiKey
                }
                await configureEnvironment(options)
                const res = await wallet.getNFTs()
                expect(res.length).to.equal(0)
            })

            it("Arbitrum, Arbitrum Odyssey", async () => {
                const apiKey = await getTestApiKey()
                const options: GlobalEnvOption = {
                    chain: new Chain({ chainId: "42161" }),
                    apiKey: apiKey
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
