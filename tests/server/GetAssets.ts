import { expect } from "chai"
import { Auth } from "../../src/auth"
import { GlobalEnvOption } from "../../src/config"
import { FunKit } from "../../src/FunKit"
import { FunWallet } from "../../src/wallet"
import { getAwsSecret, getTestApiKey } from "../getAWSSecrets"
const chainId = 5

import "../../fetch-polyfill"

describe("GetAssets", function () {
    this.timeout(120_000)
    let auth: Auth
    let wallet: FunWallet

    let fun: FunKit
    let apiKey: string
    before(async function () {
        apiKey = await getTestApiKey()
        const options: GlobalEnvOption = {
            chain: chainId,
            apiKey: apiKey,
            gasSponsor: {}
        }

        fun = new FunKit(options)
        auth = fun.getAuth({ privateKey: await getAwsSecret("PrivateKeys", "WALLET_PRIVATE_KEY") })
        wallet = await fun.createWalletWithAuth(auth, 14142)
    })

    describe("/get-tokens", () => {
        describe.skip("Positive Unit Tests", () => {
            it("Goerli, Funwallet", async () => {
                const res = await wallet.getTokens(chainId.toString(), true)
                expect(Math.floor((Object.values(res.tokens) as any)[0].price) >= 500).to.be.true
            })

            it("Mainnet, Binance 8", async () => {
                const res = await wallet.getTokens("1", true)
                expect(Math.ceil((Object.values(res.tokens) as any)[0].price) > 0).to.be.true
            })

            it("Optimism, Optimism Foundation", async () => {
                const res = await wallet.getTokens("10", true)
                expect((Object.values(res.tokens) as any)[0].tokenBalance >= 0).to.be.true
                expect(Math.ceil((Object.values(res.tokens) as any)[0].price) > 0).to.be.true
            })

            it("Polygon, Quickswap Team", async () => {
                const res = await wallet.getTokens("137", true)
                expect((Object.values(res.tokens) as any)[0].tokenBalance >= 0).to.be.true
            })

            it("Arbitrum", async () => {
                const res = await wallet.getTokens("42161", true)
                expect((Object.values(res.tokens) as any)[0].tokenBalance >= 0).to.be.true
                expect(Math.ceil((Object.values(res.tokens) as any)[0].price) > 0).to.be.true
            })
        })
    })

    describe("/get-nfts", () => {
        describe("Positive Unit Tests", () => {
            it("Goerli, Funwallet", async () => {
                const res = await wallet.getNFTs()
                expect(res.nfts.length).to.equal(0)
            })

            it("Mainnet, Franklinisbored.eth", async () => {
                const options: GlobalEnvOption = {
                    chain: "1",
                    apiKey: apiKey
                }

                const res = await wallet.getUpdatedWallet(options).getNFTs()
                expect(res.nfts.length).to.equal(0)
            })

            it("Optimism, Uniswap Positions", async () => {
                const options: GlobalEnvOption = {
                    chain: "10",
                    apiKey: apiKey
                }

                const res = await wallet.getUpdatedWallet(options).getNFTs()
                expect(res.nfts.length).to.equal(0)
            })

            it("Polygon, Uniswap Positions", async () => {
                const options: GlobalEnvOption = {
                    chain: "137",
                    apiKey: apiKey
                }

                const res = await wallet.getUpdatedWallet(options).getNFTs()
                expect(res.nfts.length).to.equal(0)
            })

            it("Arbitrum, Arbitrum Odyssey", async () => {
                const options: GlobalEnvOption = {
                    chain: "42161",
                    apiKey: apiKey
                }

                const res = await wallet.getUpdatedWallet(options).getNFTs()
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
