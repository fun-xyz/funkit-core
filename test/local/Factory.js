const { expect } = require("chai")
const { ethers } = require("ethers")
const { randomBytes } = require("ethers/lib/utils")
const { Eoa } = require("../../auth")
const { configureEnvironment } = require("../../managers")
const { TEST_PRIVATE_KEY, LOCAL_FORK_CHAIN_ID, REMOTE_FORK_CHAIN_ID, REMOTE_FORK_RPC_URL, LOCAL_FORK_RPC_URL } = require("../../utils/test")
const { FunWallet } = require("../../wallet")

describe("Factory", function () {
    let auth
    let wallet
    let salt
    var REMOTE_FORK_TEST = process.env.REMOTE_FORK_TEST;
    const FORK_CHAIN_ID = REMOTE_FORK_TEST === 'true' ? REMOTE_FORK_CHAIN_ID : LOCAL_FORK_CHAIN_ID

    const options = {
        chain: FORK_CHAIN_ID,
        apiKey: "localtest",
    }
    this.timeout(30_000)

    before(async function () {
        await configureEnvironment(options)
        const signer = new ethers.Wallet(TEST_PRIVATE_KEY)
        auth = new Eoa({ signer: signer })
        salt = randomBytes(32).toString();
        wallet = new FunWallet({ salt, index: 11450 })
    })

    it("wallet should have the same address with a salt-index combination", async () => {
        const wallet1 = new FunWallet({ salt, index: 11450 })
        const walletAddress = await wallet.getAddress()
        const wallet1Address = await wallet1.getAddress()
        expect(walletAddress).to.be.equal(wallet1Address)
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