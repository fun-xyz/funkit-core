const { expect } = require("chai")
const { FunWallet } = require("../../wallet")
const { configureEnvironment } = require("../../managers")
const { Eoa } = require("../../auth")
const { TEST_PRIVATE_KEY }= require('../testUtils')
describe("Unit Test: options.js", function () {
    this.timeout(40_000)

    it("configure environment with no options, use default goerli", async () => {
        let options = {}
        await configureEnvironment(options)
        auth = new Eoa({ privateKey: TEST_PRIVATE_KEY })
        const wallet = new FunWallet({ uniqueId: 9239, index: 23423 })
        await wallet.transfer(auth, { to: await auth.getUniqueId(), amount: .01, token: 'eth' })
        expect(global.chain.id).to.be.equal('5')
    })
})
