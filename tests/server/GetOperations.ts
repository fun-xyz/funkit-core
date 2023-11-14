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
        // this.retries(config.numRetry ? config.numRetry : 0)
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

    describe("wallet.getOperations", () => {
        describe("Positive Unit Tests", () => {
            it("Goerli, Funwallet", async () => {
                const res = await wallet.getOperations()
                expect(res).to.not.be.null
            })
        })
    })
})
