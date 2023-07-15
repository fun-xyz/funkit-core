import * as Retry from "@lifeomic/attempt"
import { expect } from "chai"
import * as sinon from "sinon"
import * as ApiUtils from "../../../src/utils/ApiUtils"

describe("Test src/utils/ApiUtils.ts", function () {
    describe("sendGetRequest", function () {
        it("Stubbed Body", async function () {
            const obj = { test: "test" }
            sinon.stub(ApiUtils, "sendRequest").resolves(obj)
            expect(await ApiUtils.sendGetRequest("https://google.com", "test", "")).to.equal(obj)
            sinon.restore()
        })
    })

    describe("sendPostRequest", function () {
        it("Stubbed Body", async function () {
            const obj = { test: "test" }
            sinon.stub(ApiUtils, "sendRequest").resolves(obj)
            expect(await ApiUtils.sendPostRequest("https://google.com", "test", {}, "")).to.equal(obj)
            sinon.restore()
        })
    })

    describe("sendRequest", function () {
        it("Stubbed Body", async function () {
            const obj = { test: "test" }
            sinon.stub(Retry, "retry").resolves(obj)
            expect(await ApiUtils.sendRequest("https://google.com", "test", "")).to.equal(obj)
            sinon.restore()
        })

        it("Should fail - Ping Google.com that doesn't have an endpoint", async function () {
            await expect(ApiUtils.sendRequest("https://google.com", "", "")).to.throw
        })
    })
})
