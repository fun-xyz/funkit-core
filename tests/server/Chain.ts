import { expect } from "chai"
import { GlobalEnvOption, configureEnvironment } from "../../src/config"
import { Chain } from "../../src/data"
import { getTestApiKey } from "../getAWSSecrets"
import "../../fetch-polyfill"

describe("Get Operations", function () {
    before(async function () {
        const apiKey = await getTestApiKey()
        const options: GlobalEnvOption = {
            chain: 5,
            apiKey: apiKey,
            gasSponsor: {}
        }
        await configureEnvironment(options)
    })

    describe("Chain", () => {
        it("Overwrite Chain", async () => {
            const eth = await Chain.getChain({ chainIdentifier: 1 })
            expect(await eth.getChainId()).to.be.equal("1")
            const goerli = await Chain.getChain({ chainIdentifier: 5 })
            expect(await goerli.getChainId()).to.be.equal("5")
            const eth2 = await Chain.getChain({ chainIdentifier: 1 })
            expect(await eth2.getChainId()).to.be.equal("1")
        })
    })
})
