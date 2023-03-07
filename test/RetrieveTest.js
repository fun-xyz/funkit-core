const { FunWallet, FunWalletConfig } = require("../index")
const { EoaAuth } = require('../src/auth/index')
const { expect } = require("chai")
const ethers = require('ethers')
const { HARDHAT_FORK_CHAIN_ID, RPC_URL, PKEY, TEST_API_KEY } = require("./TestUtils")

describe("Retrieve FunWallet", function () {
    let eoa
    before(async function () {
        const provider = new ethers.providers.JsonRpcProvider(RPC_URL)
        eoa = new ethers.Wallet(PKEY, provider)
    })

    it("wallet should have the same address as the retrieved wallet", async function () {
        this.timeout(10000)
        const walletConfig = new FunWalletConfig(eoa, HARDHAT_FORK_CHAIN_ID, 0.3, 7987)
        const wallet = new FunWallet(walletConfig, TEST_API_KEY)
        await wallet.init()

        
        const auth = new EoaAuth(eoa)
        const wallet1 = await FunWallet.retrieve(TEST_API_KEY, auth, HARDHAT_FORK_CHAIN_ID, 7987)

        expect(wallet.address).to.be.equal(wallet1.address)


    })
})