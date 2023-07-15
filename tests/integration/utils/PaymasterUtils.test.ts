import { expect } from "chai"
import { EnvOption } from "../../../src/config"
import { PaymasterType } from "../../../src/sponsors/types"
import * as PaymasterUtils from "../../../src/utils/PaymasterUtils"
describe("Test src/utils/PaymasterUtils.ts", function () {
    describe("verifyFunctionParams", function () {
        it("invalid address", async function () {
            const txOptions: EnvOption = {
                chain: 1,
                gasSponsor: {
                    sponsorAddress: "0x123"
                }
            }
            expect(() => {
                PaymasterUtils.getPaymasterType(txOptions)
            }).to.throw
        })

        it("gasless sponsor", async function () {
            const txOptions: EnvOption = {
                chain: 1,
                gasSponsor: {
                    sponsorAddress: "0xBaF6dC2E647aeb6F510f9e318856A1BCd66C5e19"
                }
            }
            expect(PaymasterUtils.getPaymasterType(txOptions)).to.equal(PaymasterType.GaslessSponsor)
        })

        it("token sponsor", async function () {
            const txOptions: EnvOption = {
                chain: 1,
                gasSponsor: {
                    sponsorAddress: "0xBaF6dC2E647aeb6F510f9e318856A1BCd66C5e19",
                    token: "0xBaF6dC2E647aeb6F510f9e318856A1BCd66C5e19"
                }
            }
            expect(PaymasterUtils.getPaymasterType(txOptions)).to.equal(PaymasterType.TokenSponsor)
        })

        it("no sponsor", async function () {
            const txOptions: EnvOption = {
                chain: 1
            }
            expect(() => {
                PaymasterUtils.getPaymasterType(txOptions)
            }).to.throw
        })
    })
})
