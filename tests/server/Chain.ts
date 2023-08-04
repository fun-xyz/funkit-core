import { expect } from "chai"
import { GlobalEnvOption, configureEnvironment } from "../../src/config"
import { Chain } from "../../src/data"
import { getTestApiKey } from "../getAWSSecrets"
import "../../fetch-polyfill"

describe("Get Operations", function () {
    this.timeout(200_000)

    before(async function () {
        const apiKey = await getTestApiKey()
        const options: GlobalEnvOption = {
            chain: 5,
            apiKey: apiKey,
            gasSponsor: undefined
        }
        await configureEnvironment(options)
    })

    describe("Chain", () => {
        it("Overwrite Chain", async () => {
            const eth = await Chain.getChain({ chainIdentifier: 1 })
            expect(await eth.getChainId()).to.be.equal("1")
            const goerli = await Chain.getChain({ chainIdentifier: 5 })
            expect(await goerli.getChainId()).to.be.equal("5")
        })
    })
})
