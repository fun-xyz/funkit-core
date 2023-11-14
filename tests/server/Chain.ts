import { expect } from "chai"
import { Chain } from "../../src/data"
import { getTestApiKey } from "../getAWSSecrets"
import "../../fetch-polyfill"

describe("Get Operations", function () {
    let apiKey: string
    before(async function () {
        apiKey = await getTestApiKey()
    })

    describe("Chain", () => {
        it("Overwrite Chain", async () => {
            const eth = await Chain.getChain({ chainIdentifier: 1 }, apiKey)
            expect(eth.getChainId()).to.be.equal("1")
            const goerli = await Chain.getChain({ chainIdentifier: 5 }, apiKey)
            expect(goerli.getChainId()).to.be.equal("5")
            const eth2 = await Chain.getChain({ chainIdentifier: 1 }, apiKey)
            expect(eth2.getChainId()).to.be.equal("1")
        })
    })
})
