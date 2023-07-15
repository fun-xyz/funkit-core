import { expect } from "chai"
import * as sinon from "sinon"
import * as apis from "../../../src/apis/AuthApis"
import * as DataUtils from "../../../src/utils/DataUtils"

describe("Test src/utils/DataUtils.ts", function () {
    describe("verifyFunctionParams", function () {
        it("valid params", async function () {
            sinon.stub(apis, "getAuth").resolves("")
            expect(DataUtils.verifyFunctionParams("", { param: 1 }, ["param"])).to.not.throw
            sinon.restore()
        })

        it("invalid params", async function () {
            sinon.stub(apis, "getAuth").resolves("")
            expect(() => {
                DataUtils.verifyFunctionParams("", [{ hi: 1 }], ["param"])
            }).to.throw
            sinon.restore()
        })
    })

    describe("formatMissingForError", function () {
        it("valid params - string", async function () {
            expect(DataUtils.formatMissingForError("missing")).to.equal("m, i, s, s, i, n, g")
        })

        it("valid params - array", async function () {
            expect(DataUtils.formatMissingForError(["missing", "missing2"])).to.equal("missing, missing2")
        })
    })
})
