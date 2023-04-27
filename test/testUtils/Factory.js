const { LOCAL_FORK_CHAIN_ID, FUN_TESTNET_CHAIN_ID, getTestApiKey } = require("../testUtils")

const FactoryTest = (config) => {
    const { chainId, authPrivateKey } = config
    const { expect } = require("chai")
    const { randomBytes } = require("ethers/lib/utils")
    const { Eoa } = require("../../auth")
    const { configureEnvironment } = require("../../managers")
    const { FunWallet } = require("../../wallet")
    const { isContract, prefundWallet, getTestApiKey } = require("../../utils")
    


    describe("Factory", function () {
        let auth
        let wallet
        let uniqueId
        this.timeout(100_000)
        before(async function () {

            const apiKey = await getTestApiKey()
            const options = {
                chain: chainId,
                apiKey: apiKey,
            }
            await configureEnvironment(options)
            auth = new Eoa({ privateKey: authPrivateKey })
            uniqueID = randomBytes(32).toString();
            wallet = new FunWallet({ uniqueID, index: 3123 })
        })


        it("wallet should have the same address with a uniqueID-index combination", async () => {
            let uniqueID1 = randomBytes(32).toString();
            const wallet1 = new FunWallet({ uniqueID, index: 3123 })
            const walletAddress = await wallet.getAddress()
            const wallet1Address = await wallet1.getAddress()
            expect(walletAddress).to.be.equal(wallet1Address)
        })

        it("wallet.create should create a wallet", async () => {
            if (chainId == FUN_TESTNET_CHAIN_ID || chainId == LOCAL_FORK_CHAIN_ID) {
                const index = Math.random() * 10000
                const wallet1 = new FunWallet({ uniqueId, index })
                const walletAddress = await wallet1.getAddress()
                let iscontract = await isContract(walletAddress)
                expect(iscontract).to.be.false
                await prefundWallet(auth, wallet1, .5)
                await wallet1.create(auth)
                iscontract = await isContract(walletAddress)
                expect(iscontract).to.be.true
            }
        })

        it("wallet should not have the same address with a different index", async () => {
            const wallet1 = new FunWallet({ uniqueId, index: 28 })
            const walletAddress = await wallet.getAddress()
            const wallet1Address = await wallet1.getAddress()
            expect(walletAddress).to.not.be.equal(wallet1Address)
        })

        it("wallet should not have the same address with a different uniqueId", async () => {
            let uniqueId1 = randomBytes(32).toString();
            const wallet1 = new FunWallet({ uniqueId: uniqueId1, index: 3923 })
            const walletAddress = await wallet.getAddress()
            const wallet1Address = await wallet1.getAddress()
            expect(walletAddress).to.not.be.equal(wallet1Address)
        })
    })
}

module.exports = { FactoryTest }