import { expect } from "chai"
import * as sinon from "sinon"
import { validate } from "uuid"
import * as apis from "../../../src/apis/AuthApis"
import * as AuthUtils from "../../../src/utils/AuthUtils"
describe("Test src/utils/AuthUtils.ts", function () {
    describe("getStoredUniqueId", function () {
        it("Stubbed Body", async function () {
            sinon.stub(apis, "getAuth").resolves("")
            expect(await AuthUtils.getStoredUniqueId("chazz###twitter")).to.equal(null)
            sinon.restore()
        })
        it("Stubbed Body - returns uniqueId", async function () {
            sinon.stub(apis, "getAuth").resolves({ data: { uniqueId: "test" } })
            expect(await AuthUtils.getStoredUniqueId("chazz###twitter")).to.equal("test")
            sinon.restore()
        })
    })

    describe("setStoredUniqueId", function () {
        it("Stubbed Body - Uses twitter multiauth", async function () {
            sinon.stub(apis, "setAuth").resolves()
            expect(await AuthUtils.setStoredUniqueId("chazz###twitter", "test")).to.not.throw
            sinon.restore()
        })
        it("Stubbed Body - Returns EOA Address", async function () {
            sinon.stub(apis, "setAuth").resolves()
            expect(await AuthUtils.setStoredUniqueId("0x7aED98f03Cab4bf774Cc8e8accE709F9E10d3EC8", "test")).to.not.throw
            sinon.restore()
        })
    })

    describe("getUniqueId", function () {
        it("Stubbed Body", async function () {
            const obj = { test: "test" }
            sinon.stub(AuthUtils, "getStoredUniqueId").resolves(obj)
            expect(await AuthUtils.getUniqueId("")).to.equal(obj)
            sinon.restore()
        })

        it("Stubbed Body", async function () {
            sinon.stub(AuthUtils, "getStoredUniqueId").resolves("")
            sinon.stub(apis, "setAuth").resolves()
            expect(validate(await AuthUtils.getUniqueId(""))).to.equal(true)
            sinon.restore()
        })
    })
})
