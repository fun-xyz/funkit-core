import { expect } from "chai"
import { getOrgInfo } from "../../../src/apis/DashboardApis"

const DUMMY_KEY = "MYny3w7xJh6PRlRgkJ9604sHouY2MTke6lCPpSHq"

describe("Dashboard Test", function () {
    this.timeout(100_000)
    it("getOrgInfo", async () => {
        const orgInfo = await getOrgInfo(DUMMY_KEY)
        expect(orgInfo).to.have.property("name", "Fun Public Testing")
    })
})
