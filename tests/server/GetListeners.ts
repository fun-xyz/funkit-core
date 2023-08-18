import { expect } from "chai"
import { createListener, deleteListener } from "../../src/apis/ListenerApis"
import { GlobalEnvOption, configureEnvironment } from "../../src/config"
import { getTestApiKey } from "../getAWSSecrets"
const chainId = "5"
import "../../fetch-polyfill"

describe("Get Operations", function () {
    this.timeout(200_000)

    before(async function () {
        const apiKey = await getTestApiKey()
        const options: GlobalEnvOption = {
            chain: chainId,
            apiKey: apiKey,
            gasSponsor: {}
        }
        await configureEnvironment(options)
    })

    describe("Listeners", () => {
        describe("Positive Unit Tests", () => {
            it("createListener", async () => {
                const res = await createListener(
                    ["0x62033e31048e2A82569a3e90E258e962E0510DfB"],
                    ["5"],
                    "https://webhook.site/#!/0d77df73-13e3-44d0-b2cc-65d0954d679d"
                )
                expect(res).to.deep.equal({})
            })
        })
        describe("Positive Unit Tests", () => {
            it("deleteListener", async () => {
                const res = await deleteListener("0x62033e31048e2A82569a3e90E258e962E0510DfB", "5")
                expect(res).to.deep.equal({})
            })
        })
    })
})
