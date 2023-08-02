import { expect } from "chai"
import { Auth } from "../../src/auth"
import { GlobalEnvOption, configureEnvironment } from "../../src/config"
import { FunWallet } from "../../src/wallet"
import { getAwsSecret, getTestApiKey } from "../getAWSSecrets"
const chainId = 5

import "../../fetch-polyfill"

describe("GetAssets", function () {
    this.timeout(120_000)
    let auth: Auth
    let wallet: FunWallet
    before(async function () {
        const apiKey = await getTestApiKey()
        const options: GlobalEnvOption = {
            chain: chainId,
            apiKey: apiKey,
            gasSponsor: undefined
        }
        await configureEnvironment(options)
        auth = new Auth({ privateKey: await getAwsSecret("PrivateKeys", "WALLET_PRIVATE_KEY") })

        wallet = new FunWallet({
            users: [{ userId: await auth.getAddress() }],
            uniqueId: await auth.getWalletUniqueId(chainId.toString(), 14142)
        })
    })

    describe("/get-tokens", () => {
        describe("Positive Unit Tests", () => {
            it("Goerli, Funwallet", async () => {
                const res = await wallet.getTokens(chainId.toString(), true)
                expect(Math.floor((Object.values(res.tokens) as any)[0].price) >= 500).to.be.true
            })

            it("Mainnet, Binance 8", async () => {
                const apiKey = await getTestApiKey()
                const options: GlobalEnvOption = {
                    chain: "1",
                    apiKey: apiKey
                }
                await configureEnvironment(options)
                const res = await wallet.getTokens(chainId.toString(), true)
                expect(Math.ceil((Object.values(res.tokens) as any)[0].price) > 0).to.be.true
            })

            it("Optimism, Optimism Foundation", async () => {
                const apiKey = await getTestApiKey()
                const options: GlobalEnvOption = {
                    chain: "10",
                    apiKey: apiKey
                }
                await configureEnvironment(options)
                const res = await wallet.getTokens(chainId.toString(), true)
                expect((Object.values(res.tokens) as any)[0].tokenBalance >= 0).to.be.true
                expect(Math.ceil((Object.values(res.tokens) as any)[0].price) > 0).to.be.true
            })

            it("Polygon, Quickswap Team", async () => {
                const apiKey = await getTestApiKey()
                const options: GlobalEnvOption = {
                    chain: "137",
                    apiKey: apiKey
                }
                await configureEnvironment(options)
                const res = await wallet.getTokens(chainId.toString(), true)
                expect((Object.values(res.tokens) as any)[0].tokenBalance >= 0).to.be.true
            })

            it("Arbitrum", async () => {
                const apiKey = await getTestApiKey()
                const options: GlobalEnvOption = {
                    chain: "42161",
                    apiKey: apiKey
                }
                await configureEnvironment(options)
                const res = await wallet.getTokens(chainId.toString(), true)
                expect((Object.values(res.tokens) as any)[0].tokenBalance >= 0).to.be.true
                expect(Math.ceil((Object.values(res.tokens) as any)[0].price) > 0).to.be.true
            })
        })
    })

    describe("/get-nfts", () => {
        describe("Positive Unit Tests", () => {
            it("Goerli, Funwallet", async () => {
                const apiKey = await getTestApiKey()
                const options: GlobalEnvOption = {
                    chain: "5",
                    apiKey: apiKey
                }
                await configureEnvironment(options)
                const res = await wallet.getNFTs()
                expect(res.nfts.length).to.equal(0)
            })

            it("Mainnet, Franklinisbored.eth", async () => {
                const apiKey = await getTestApiKey()
                const options: GlobalEnvOption = {
                    chain: "1",
                    apiKey: apiKey
                }
                await configureEnvironment(options)
                const res = await wallet.getNFTs()
                expect(res.nfts.length).to.equal(0)
            })

            it.skip("Optimism, Uniswap Positions", async () => {
                const apiKey = await getTestApiKey()
                const options: GlobalEnvOption = {
                    chain: "10",
                    apiKey: apiKey
                }
                await configureEnvironment(options)
                const res = await wallet.getNFTs()
                expect(res.nfts.length).to.equal(0)
            })

            it.skip("Polygon, Uniswap Positions", async () => {
                const apiKey = await getTestApiKey()
                const options: GlobalEnvOption = {
                    chain: "137",
                    apiKey: apiKey
                }
                await configureEnvironment(options)
                const res = await wallet.getNFTs()
                expect(res.nfts.length).to.equal(0)
            })

            it.skip("Arbitrum, Arbitrum Odyssey", async () => {
                const apiKey = await getTestApiKey()
                const options: GlobalEnvOption = {
                    chain: "42161",
                    apiKey: apiKey
                }
                await configureEnvironment(options)
                const res = await wallet.getNFTs()
                expect(res.nfts.length).to.equal(0)
            })
        })
    })

    describe("getAllTokens()", () => {
        describe("Positive Tests", () => {
            it("Sanity Test", async () => {
                const res = await wallet.getTokens("ALL")
                expect(Object.keys(res).length).to.be.gte(1)
            })
        })
    })

    describe("getAllNFTs()", () => {
        describe("Positive Tests", () => {
            it("Sanity Test", async () => {
                const res = await wallet.getTokens("ALL")
                expect(Object.keys(res).length).to.be.gte(1)
            })
        })
    })

    describe("getAssets()", () => {
        describe("Positive Tests", () => {
            it("Sanity Test", async () => {
                const res: any = await wallet.getAssets()
                expect(Object.keys(Object.keys(res)).length).to.be.gte(1)
            })
        })
    })
})
