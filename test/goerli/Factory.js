const { expect } = require("chai")
const { randomBytes } = require("ethers/lib/utils")
const { Eoa } = require("../../auth")
const { configureEnvironment } = require("../../managers")
const { TEST_PRIVATE_KEY, TEST_API_KEY } = require("../testUtils")
const { FunWallet } = require("../../wallet")
const { isContract, prefundWallet, GOERLI_PRIVATE_KEY } = require("../../utils")

const options = {
    chain: 5,
    apiKey: TEST_API_KEY,
}

describe("Factory", function () {
    let auth
    let wallet
    let salt
    let funder
    this.timeout(50_000)

    before(async function () {
        await configureEnvironment(options)
        
        auth = new Eoa({ privateKey: TEST_PRIVATE_KEY })
        funder = new Eoa({ privateKey: GOERLI_PRIVATE_KEY })
        salt = randomBytes(32).toString();
        wallet = new FunWallet({ salt, index: 0 })
    })

    it("wallet should have the same address with a salt-index combination", async () => {
        let salt1 = randomBytes(32).toString();
        const wallet1 = new FunWallet({ salt, index: 0 })
        const walletAddress = await wallet.getAddress()
        const wallet1Address = await wallet1.getAddress()
        expect(walletAddress).to.be.equal(wallet1Address)
    })

    it("wallet.create should create a wallet", async () => {
        const index = Math.random() * 10000
        const wallet1 = new FunWallet({ salt, index })
        const walletAddress = await wallet1.getAddress()
        let iscontract = await isContract(walletAddress)
        expect(iscontract).to.be.false
        await prefundWallet(funder, wallet1, .3)
        await wallet1.create(auth)
        iscontract = await isContract(walletAddress)
        expect(iscontract).to.be.true
    })

    it("wallet should not have the same address with a different index", async () => {
        const wallet1 = new FunWallet({ salt, index: 1 })
        const walletAddress = await wallet.getAddress()
        const wallet1Address = await wallet1.getAddress()
        expect(walletAddress).to.not.be.equal(wallet1Address)
    })

    it("wallet should not have the same address with a different salt", async () => {
        let salt1 = randomBytes(32).toString();
        const wallet1 = new FunWallet({ salt: salt1, index: 0 })
        const walletAddress = await wallet.getAddress()
        const wallet1Address = await wallet1.getAddress()
        expect(walletAddress).to.not.be.equal(wallet1Address)
    })
})