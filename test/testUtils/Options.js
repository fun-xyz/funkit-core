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
    it("test offline twitter get address", async()=>{
        const addr = await FunWallet.getAddress(
            "2cbc0396-2a16-4b3f-937c-52406a969000",
            0,
            "https://goerli.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161",
            "0x4FDffD240962F560BD3CA859a60034baa51ce3b2",
    
        );
        expect(addr).to.be.equal("0x206C090CC5b87d5402c6530262380d89258495eA")
    })
})
