const { expect, assert } = require("chai")
const ethers = require('ethers')

const { FunWallet, FunWalletConfig } = require('../../index')
const { TEST_API_KEY } = require('../TestUtils')
const { ETHEREUM } = require('../TestnetConfig')

//PLEASE READ 
//Steps to take before running this test
//1. Ensure your wallet has enough goerliEth to meet the prefund amount

describe("FunWalletFactory", function () {
    let eoa, wallet
    before(async function () {
        this.timeout(90000)
        await new Promise(resolve => setTimeout(resolve, 5000));
        const provider = new ethers.providers.JsonRpcProvider(ETHEREUM.GOERLI.RPC)
        eoa = new ethers.Wallet(ETHEREUM.GOERLI.PRIVKEY, provider)
        console.log(`Eoa Address: ${eoa.address}`)

        const balance = await provider.getBalance(eoa.address)
        const balanceInEth = parseFloat(ethers.utils.formatEther(balance))
        console.log(`Balance of Wallet: ${balanceInEth}eth`)
        assert.isBelow(ETHEREUM.GOERLI.PREFUNDAMT, balanceInEth, `Balance of wallet is less than ${ETHEREUM.GOERLI.PREFUNDAMT}, please load up with GoerliEth in a faucet.`)

    })

    it("Success case", async function () {
        //TODO: add faucet docs
        this.timeout(120000)

        const config = new FunWalletConfig(eoa, ETHEREUM.GOERLI.CHAIN, ETHEREUM.GOERLI.PREFUNDAMT)
        wallet = new FunWallet(config, TEST_API_KEY);
        await wallet.init()
        console.log(`FunWallet Address: ${wallet.address}`)

        const walletConfig1 = new FunWalletConfig(eoa, ETHEREUM.GOERLI.CHAIN, ETHEREUM.GOERLI.PREFUNDAMT)
        const wallet1 = new FunWallet(walletConfig1, TEST_API_KEY)
        await wallet1.init()

        expect(wallet.address).to.be.equal(wallet1.address)
    })
})

