import { expect } from "chai"
import { Auth } from "../../src/auth"
import { GlobalEnvOption } from "../../src/config"
import { FunKit } from "../../src/FunKit"
import { FunWallet } from "../../src/wallet"
import { getAwsSecret, getTestApiKey } from "../getAWSSecrets"
const chainId = "5"
import "../../fetch-polyfill"

describe("Get Operations", function () {
    this.timeout(200_000)
    let auth: Auth
    let wallet: FunWallet

    let fun: FunKit
    before(async function () {
        const apiKey = await getTestApiKey()
        const options: GlobalEnvOption = {
            chain: chainId,
            apiKey: apiKey,
            gasSponsor: {}
        }

        fun = new FunKit(options)
        auth = fun.getAuth({ privateKey: await getAwsSecret("PrivateKeys", "WALLET_PRIVATE_KEY") })
        wallet = await fun.createWalletWithAuth(auth, 1792811340)
    })

    describe("MoonPay", () => {
        describe("Positive Unit Tests", () => {
            it("wallet.onRamp", async () => {
                const res = await wallet.onRamp()
                expect(res).to.have.string("http")
                expect(res).to.have.string("buy")
            })
        })
        describe("Positive Unit Tests", () => {
            it("wallet.offRamp", async () => {
                const res = await wallet.offRamp()
                expect(res).to.have.string("http")
                expect(res).to.have.string("sell")
            })
        })
    })

    describe("Get Supported Currencies", () => {
        it("wallet.getSupportedCurrencies", async () => {
            const res = await wallet.getSupportedCurrencies()
            expect(res).to.be.an("array")
            expect(res.length).to.be.greaterThan(0)
            expect(res[0]).to.have.property("id")
            expect(res[0]).to.have.property("name")
            expect(res[0]).to.have.property("code")
        })
    })
})
