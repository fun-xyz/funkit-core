const { expect } = require("chai")
const { ethers } = require("ethers")
const { randomBytes } = require("ethers/lib/utils")
const { Eoa } = require("../../auth")
const { configureEnvironment } = require("../../managers")
const { FunWallet } = require("../../wallet")
const { isContract, prefundWallet, TEST_PRIVATE_KEY, LOCAL_FORK_CHAIN_ID, FUN_TESTNET_CHAIN_ID, FUN_TESTNET_RPC_URL, LOCAL_FORK_RPC_URL, getTestApiKey  } = require("../../utils")
describe("Factory", function () {
    let auth
    let wallet
    let uniqueID
    var REMOTE_TEST = process.env.REMOTE_TEST;
    const FORK_CHAIN_ID = REMOTE_TEST === 'true' ? FUN_TESTNET_CHAIN_ID : LOCAL_FORK_CHAIN_ID
    this.timeout(30_000)

    before(async function () {
        const apiKey = await getTestApiKey()
        const options = {
            chain: FORK_CHAIN_ID,
            apiKey: apiKey,
        }
        await configureEnvironment(options)
        const signer = new ethers.Wallet(TEST_PRIVATE_KEY)
        auth = new Eoa({ signer: signer })
        uniqueID = randomBytes(32).toString();
        wallet = new FunWallet({ uniqueID, index: 11450 })
    })

    it("wallet should have the same address with a uniqueID-index combination", async () => {
        const wallet1 = new FunWallet({ uniqueID, index: 11450 })
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
        await prefundWallet(auth, wallet1, .2)
        await wallet1.create(auth)
        iscontract = await isContract(walletAddress)
        expect(iscontract).to.be.true
    })
    it("wallet should not have the same address with a different index", async () => {
        const wallet1 = new FunWallet({ uniqueID, index: 1 })
        const walletAddress = await wallet.getAddress()
        const wallet1Address = await wallet1.getAddress()
        expect(walletAddress).to.not.be.equal(wallet1Address)
    })
    it("wallet should not have the same address with a different uniqueID", async () => {
        let uniqueID1 = randomBytes(32).toString();
        const wallet1 = new FunWallet({ uniqueID: uniqueID1, index: 0 })
        const walletAddress = await wallet.getAddress()
        const wallet1Address = await wallet1.getAddress()
        expect(walletAddress).to.not.be.equal(wallet1Address)
    })

})