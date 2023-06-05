import { expect } from "chai"
import { getContractAbi } from "../../../src/apis/ContractApis"
import { GlobalEnvOption, configureEnvironment } from "../../../src/config"
import { getTestApiKey } from "../../getAWSSecrets"

describe("InfoApis Test", function () {
    this.timeout(100_000)

    before(async () => {
        const apiKey = await getTestApiKey()
        const options: GlobalEnvOption = {
            chain: "5",
            apiKey: apiKey
        }
        await configureEnvironment(options)
    })
    it("getOrgInfo", async () => {
        const orgInfo = await getContractAbi("TokenPaymaster")
        expect(orgInfo).to.have.property("abi")
    })
})
