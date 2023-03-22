const { FunWallet, FunWalletConfig } = require("../../index")
const { expect } = require("chai")
const ethers = require('ethers')
const { REMOTE_FORK_CHAIN_ID, LOCAL_FORK_CHAIN_ID, REMOTE_FORK_RPC_URL, LOCAL_FORK_RPC_URL, PKEY, TEST_API_KEY } = require("../TestUtils")

describe("FunWalletFactory", function () {
    let eoa
    var REMOTE_FORK_TEST = process.env.REMOTE_FORK_TEST;
    var REMOTE_FORK_TEST = process.env.REMOTE_FORK_TEST;
    const FORK_CHAIN_ID = REMOTE_FORK_TEST === 'true' ? REMOTE_FORK_CHAIN_ID : LOCAL_FORK_CHAIN_ID
    const RPC_URL = REMOTE_FORK_TEST === 'true' ? REMOTE_FORK_RPC_URL : LOCAL_FORK_RPC_URL

    before(async function () {
        const provider = new ethers.providers.JsonRpcProvider(RPC_URL)
        eoa = new ethers.Wallet(PKEY, provider)
    })

    it("wallet should have the same address even we create the wallet twice", async function () {
        this.timeout(30000)
        const salt = ethers.utils.randomBytes(32).toString();
        const walletConfig = new FunWalletConfig(eoa, FORK_CHAIN_ID, 0.3, salt)
        const wallet = new FunWallet(walletConfig, TEST_API_KEY)
        await wallet.init()

        const walletConfig1 = new FunWalletConfig(eoa, FORK_CHAIN_ID, 0.3, salt)

        const wallet1 = new FunWallet(walletConfig1, TEST_API_KEY)
        await wallet1.init()

        expect(wallet.address).to.be.equal(wallet1.address)
    })
})