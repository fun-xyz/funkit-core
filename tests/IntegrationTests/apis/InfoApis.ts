import { expect } from "chai"
import { getChainFromName, getChainInfo, getModuleInfo, getPaymasterAddress, getTokenInfo } from "../../../src/apis/InfoApis"
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
    it("getTokenInfo", async () => {
        const tokenInfo = await getTokenInfo("usdc", "5")
        expect(tokenInfo).to.be.equal("0x07865c6E87B9F70255377e024ace6630C1Eaa37F")
    })

    it("getChainInfo", async () => {
        const chainInfo = await getChainInfo("5")
        expect(chainInfo).to.have.property("chain", "5")
        expect(chainInfo).to.have.property("aaData")
    })

    it("getChainFromName", async () => {
        const chainInfo = await getChainFromName("ethereum-goerli")
        expect(chainInfo).to.have.property("chain", "5")
        expect(chainInfo).to.have.property("aaData")
    })

    it("getModuleInfo", async () => {
        const moduleInfo = await getModuleInfo("paymaster", "5")
        expect(moduleInfo).to.have.property("oracle")
    })

    it("getPaymasterAddress", async () => {
        const paymasterAddress = await getPaymasterAddress("5")
        expect(paymasterAddress).to.have.property("oracle")
    })
})
