import { expect } from "chai"
import { Auth, Eoa } from "../../src/auth"
import { GlobalEnvOption, configureEnvironment } from "../../src/config"
import { FunWallet } from "../../src/wallet"
import { getAwsSecret, getTestApiKey } from "../getAWSSecrets"
const chainId = "5"

import "../../fetch-polyfill"

describe("Get Operations", function () {
    this.timeout(200_000)
    let auth: Auth
    let wallet: FunWallet
    before(async function () {
        // this.retries(config.numRetry ? config.numRetry : 0)
        const apiKey = await getTestApiKey()
        const options: GlobalEnvOption = {
            chain: chainId,
            apiKey: apiKey,
            gasSponsor: undefined
        }
        await configureEnvironment(options)
        auth = new Eoa({ privateKey: await getAwsSecret("PrivateKeys", "WALLET_PRIVATE_KEY") })
        wallet = new FunWallet({ uniqueId: await auth.getUniqueId(), index: 1792811340 })
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
