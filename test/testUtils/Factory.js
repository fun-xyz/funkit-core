const FactoryTest = (chainId, authPrivateKey, apiKey = "localtest") => {
    const { expect } = require("chai")
    const { randomBytes } = require("ethers/lib/utils")
    const { Eoa } = require("../../auth")
    const { configureEnvironment } = require("../../managers")
    const { FunWallet } = require("../../wallet")
    const { isContract, prefundWallet } = require("../../utils")
    const options = {
        chain: chainId,
        apiKey: apiKey,
    }

    describe("Factory", function () {
        let auth
        let wallet
        let uniqueID
        this.timeout(100_000)
        before(async function () {
            await configureEnvironment(options)
            auth = new Eoa({ privateKey: authPrivateKey })
            uniqueID = randomBytes(32).toString();
            wallet = new FunWallet({ uniqueID, index: 3923 })
        })
        
        // it("configure environment with no options, use default", async () => {
        //     let options = {}
        //     await configureEnvironment(options)
        //     const wallet = new FunWallet({ uniqueID:9239, index: 23423 })
        //     await wallet.transfer(auth, { to: await auth.getUniqueId(), amount: .01, token: 'eth' })
        // })

        it("wallet should have the same address with a uniqueID-index combination", async () => {
            let uniqueID1 = randomBytes(32).toString();
            const wallet1 = new FunWallet({ uniqueID, index: 3923 })
            const walletAddress = await wallet.getAddress()
            const wallet1Address = await wallet1.getAddress()
            expect(walletAddress).to.be.equal(wallet1Address)
        })

        it("wallet.create should create a wallet", async () => {
            const index = Math.random() * 10000
            const wallet1 = new FunWallet({ uniqueID, index })
            const walletAddress = await wallet1.getAddress()
            let iscontract = await isContract(walletAddress)
            expect(iscontract).to.be.false
            await prefundWallet(auth, wallet1, .3)
            await wallet1.create(auth)
            iscontract = await isContract(walletAddress)
            expect(iscontract).to.be.true
        })

        it("wallet should not have the same address with a different index", async () => {
            const wallet1 = new FunWallet({ uniqueID, index: 28 })
            const walletAddress = await wallet.getAddress()
            const wallet1Address = await wallet1.getAddress()
            expect(walletAddress).to.not.be.equal(wallet1Address)
        })

        it("wallet should not have the same address with a different uniqueID", async () => {
            let uniqueID1 = randomBytes(32).toString();
            const wallet1 = new FunWallet({ uniqueID: uniqueID1, index: 3923 })
            const walletAddress = await wallet.getAddress()
            const wallet1Address = await wallet1.getAddress()
            expect(walletAddress).to.not.be.equal(wallet1Address)
        })


    })
}

module.exports = { FactoryTest }