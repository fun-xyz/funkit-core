import { expect } from "chai"
import { GlobalEnvOption, configureEnvironment } from "../../../src/config"
import { FunWallet } from "../../../src/wallet"
import { getTestApiKey } from "../../getAWSSecrets"

describe("WalletAbiManager", function () {
    let wallet: FunWallet
    let options: GlobalEnvOption
    this.timeout(300_000)

    describe("getAssets()", () => {
        before(async () => {
            const apiKey = await getTestApiKey()
            options = {
                chain: "5",
                apiKey: apiKey,
                gasSponsor: undefined
            }
            await configureEnvironment(options)
            wallet = new FunWallet({ uniqueId: "jamal murray", index: 3123 })
        })

        it("Only verified tokens", async () => {
            const res = await wallet.getAssets(true, false)
            expect(res["tokens"]["WETH"].length > 0)
            expect(res["tokens"]["WMATIC"].length > 0)
            expect(res["tokens"]["1:0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"].length > 0)
            expect(res["tokens"]["5:0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"].length > 0)
            expect(res["tokens"]["10:0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"].length > 0)
            expect(res["tokens"]["56:0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"].length > 0)
            expect(res["tokens"]["137:0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"].length > 0)
            expect(res["tokens"]["42161:0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"].length > 0)
            expect(Object.keys(res["nfts"]).length > 0)
        })

        it("All tokens", async () => {
            const res = await wallet.getAssets(false, false)
            expect(res["tokens"]["WETH"].length > 0)
            expect(res["tokens"]["WMATIC"].length > 0)
            expect(res["tokens"]["1:0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"].length > 0)
            expect(res["tokens"]["5:0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"].length > 0)
            expect(res["tokens"]["10:0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"].length > 0)
            expect(res["tokens"]["56:0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"].length > 0)
            expect(res["tokens"]["137:0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"].length > 0)
            expect(res["tokens"]["42161:0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"].length > 0)
            expect(Object.keys(res["nfts"]).length > 0)
        })

        it("Status=true", async () => {
            await wallet.getAssets(true, true, options)
        })
    })

    describe("getAllTokens()", () => {
        before(async () => {
            const apiKey = await getTestApiKey()
            options = {
                chain: "5",
                apiKey: apiKey,
                gasSponsor: undefined
            }
            await configureEnvironment(options)
            wallet = new FunWallet({ uniqueId: "jamal murray", index: 3123 })
        })

        it("Only verified tokens = true", async () => {
            const res = await wallet.getAllTokens(true)
            expect(res["WETH"].length > 0)
            expect(res["WMATIC"].length > 0)
            expect(res["1:0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"].length > 0)
            expect(res["5:0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"].length > 0)
            expect(res["10:0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"].length > 0)
            expect(res["56:0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"].length > 0)
            expect(res["137:0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"].length > 0)
            expect(res["42161:0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"].length > 0)
        })

        it("Only verified tokens = false", async () => {
            const res = await wallet.getAllTokens(false)
            expect(res["WETH"].length > 0)
            expect(res["WMATIC"].length > 0)
            expect(res["1:0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"].length > 0)
            expect(res["5:0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"].length > 0)
            expect(res["10:0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"].length > 0)
            expect(res["56:0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"].length > 0)
            expect(res["137:0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"].length > 0)
            expect(res["42161:0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"].length > 0)
        })
    })

    describe("getAllNfts()", () => {
        before(async () => {
            const apiKey = await getTestApiKey()
            options = {
                chain: "5",
                apiKey: apiKey,
                gasSponsor: undefined
            }
            await configureEnvironment(options)
            wallet = new FunWallet({ uniqueId: "jamal murray", index: 3123 })
        })

        it("Get All NFTs", async () => {
            const res = await wallet.getAllNFTs()
            expect(Object.keys(res).length > 0)
        })
    })

    describe("getNfts()", () => {
        before(async () => {
            const apiKey = await getTestApiKey()
            options = {
                chain: "5",
                apiKey: apiKey,
                gasSponsor: undefined
            }
            await configureEnvironment(options)
            wallet = new FunWallet({ uniqueId: "jamal murray", index: 3123 })
        })

        it("Get All NFTs", async () => {
            const res = await wallet.getAllNFTs()
            expect(Object.keys(res).length > 0)
        })
    })

    describe("getTokens()", () => {
        before(async () => {
            const apiKey = await getTestApiKey()
            options = {
                chain: "5",
                apiKey: apiKey,
                gasSponsor: undefined
            }
            await configureEnvironment(options)
            wallet = new FunWallet({ uniqueId: "jamal murray", index: 3123 })
        })

        it("get verified tokens", async () => {
            const res = await wallet.getTokens(true)
            expect(Object.keys(res).length > 0)
        })

        it("get all tokens", async () => {
            const res = await wallet.getTokens(false)
            expect(Object.keys(res).length > 0)
        })
    })
})
