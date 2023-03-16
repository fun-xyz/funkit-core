const { FunWallet, FunWalletConfig } = require("../../index")
const { expect } = require("chai")
const ethers = require('ethers')
const { HARDHAT_FORK_CHAIN_ID, RPC_URL, PKEY, TEST_API_KEY } = require("./TestUtils")

describe("FunWalletFactory", function() {
    let eoa
    before(async function() {
        const provider = new ethers.providers.JsonRpcProvider(RPC_URL)
        eoa = new ethers.Wallet(PKEY, provider)
    })

    it("wallet should have the same address even we create the wallet twice", async function() {
        this.timeout(30000)
        const walletConfig = new FunWalletConfig(eoa, await eoa.getAddress(), HARDHAT_FORK_CHAIN_ID, 0.3)
        const wallet = new FunWallet(walletConfig, TEST_API_KEY)
        await wallet.init()

        const walletConfig1 = new FunWalletConfig(eoa, await eoa.getAddress(), HARDHAT_FORK_CHAIN_ID, 0)
        const wallet1 = new FunWallet(walletConfig1, TEST_API_KEY)
        await wallet1.init()
        
        expect(wallet.address).to.be.equal(wallet1.address)
    })
})