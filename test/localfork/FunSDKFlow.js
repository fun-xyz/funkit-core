const { FunWallet, FunWalletConfig, FunAccountManager } = require("../../index")
const { expect } = require("chai")
const ethers = require('ethers')
const { HARDHAT_FORK_CHAIN_ID, RPC_URL, PKEY, TEST_API_KEY } = require("../TestUtils")
const { assert } = require("console")

describe("Fun SDK Flow", function () {
    let eoa
    before(async function () {
        const provider = new ethers.providers.JsonRpcProvider(RPC_URL)
        eoa = new ethers.Wallet(PKEY, provider)
    })

    it("Fun Wallet Factory: wallet should have the same address even we create the wallet twice", async function () {
        this.timeout(30000)
        const salt = ethers.utils.randomBytes(32).toString();
        const walletConfig = new FunWalletConfig(eoa, HARDHAT_FORK_CHAIN_ID, salt)
        const wallet = new FunWallet(walletConfig, TEST_API_KEY)
        await wallet.init()
        await FunWallet.utils.fund(eoa, wallet.address, 0.3)

        const walletConfig1 = new FunWalletConfig(eoa, HARDHAT_FORK_CHAIN_ID, salt)
        const wallet1 = new FunWallet(walletConfig1, TEST_API_KEY)
        await wallet1.init()
        await FunWallet.utils.fund(eoa, wallet.address, 0.3)

        expect(wallet.address).to.be.equal(wallet1.address)
    })
    it("FunAccountManager Success Case", async function () {
        const env_options = {
            paymaster: {
                "sponsor_address": "sdfd",
                "token_name": "sdfsdf"
            },
            api_key: "hello123",
            sendTxLater: true,
            chains: ["ethereum", "polygon"]
        }
        FunAccountManager.configureEnvironment(env_options)
        expect(global.api_key).to.be.equal(env_options.api_key)
        expect(global.paymaster).to.be.equal(env_options.paymaster)
        expect(global.sendTxLater).to.be.equal(env_options.sendTxLater)
        expect(global.chains).to.be.equal(env_options.chains)
    })
    it("FunAccountManager Fail Case", async function () {
        const env_options = {
            paymaster: {
                "sponsor_adress": "",
                "token_name": ""
            },
            api_key: "hello123",
            sendTxLater: true,
            chains: "sdfklsdkf"
        }
        expect(() => FunAccountManager.configureEnvironment(env_options)).to.throw('Error configuring. Please refer to documentation. Message: Error: Incorrect paymaster format.')
    })

})