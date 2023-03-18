const { expect, assert } = require("chai")
const ethers = require('ethers')
const { EoaAaveWithdrawal } = require("../../src/modules/index")

const { FunWallet, FunWalletConfig } = require('../../index')
const { TEST_API_KEY, getAddrBalanceErc, PKEY} = require('../TestUtils')
const { ETHEREUM } = require('../TestnetConfig')
const { TokenPaymaster, PaymasterSponsor } = require("../../src/paymasters")

const WITHDRAW_AMOUNT = "1000000000000000000"

//PLEASE READ 
//Steps to take before running this test
//1. Ensure your wallet has enough goerliEth to meet the prefund amount
//2. Ensure that an AAVE Dai position has been declared 

describe("Paymaster - Aave Withdraw", function () {
    let eoa, wallet
    before(async function () {
        this.timeout(90000)
        const provider = new ethers.providers.JsonRpcProvider(ETHEREUM.GOERLI.RPC)
        eoa = new ethers.Wallet(ETHEREUM.GOERLI.PRIVKEY, provider)
        console.log(`Eoa Address: ${eoa.address}`)

        const balance = await provider.getBalance(eoa.address)
        const balanceInEth = parseFloat(ethers.utils.formatEther(balance))
        console.log(`Balance of Wallet: ${balanceInEth}eth`)
        assert.isBelow(ETHEREUM.GOERLI.PREFUNDAMT, balanceInEth, `Balance of wallet is less than ${ETHEREUM.GOERLI.PREFUNDAMT}, please load up with GoerliEth in a faucet.`)
        const paymaster = new TokenPaymaster(ETHEREUM.GOERLI.FUNDERADDRESS, ETHEREUM.GOERLI.CHAIN)

        const config = new FunWalletConfig(eoa, ETHEREUM.GOERLI.CHAIN, ETHEREUM.GOERLI.PREFUNDAMT, "", paymaster)
        wallet = new FunWallet(config, TEST_API_KEY);
        await wallet.init()
        console.log(`FunWallet Address: ${wallet.address}`)
    })

    it("Success case", async function () {
        //TODO: add faucet docs
        this.timeout(120000)

        const eoaATokenBalance = await getAddrBalanceErc(eoa, ETHEREUM.GOERLI.ADAIADDRESS, eoa.address)
        expect(eoaATokenBalance).to.not.equal("0.0", "Position not declared. Please supply an AAVE DAI position.")

        const module = new EoaAaveWithdrawal()
        await wallet.addModule(module)

        const modulePreExecTxs = await module.getPreExecTxs(ETHEREUM.GOERLI.ADAIADDRESS, WITHDRAW_AMOUNT)
        await wallet.deployTxs(modulePreExecTxs)
        await module.verifyRequirements(ETHEREUM.GOERLI.ADAIADDRESS, WITHDRAW_AMOUNT)
        await wallet.deploy()

        const aaveActionTx = await module.createWithdrawTx(ETHEREUM.GOERLI.ADAIADDRESS, eoa.address, WITHDRAW_AMOUNT)
        const receipt = await wallet.deployTx(aaveActionTx)

        console.log(receipt)
        const endEoaATokenBalance = await getAddrBalanceErc(eoa, ETHEREUM.GOERLI.ADAIADDRESS, eoa.address)

        expect(eoaATokenBalance - endEoaATokenBalance).to.be.greaterThan(0)
    })

})


const main = async () => {
    const paymaster = new TokenPaymaster(ETHEREUM.GOERLI.FUNDERADDRESS, "5")
    const config = new FunWalletConfig(eoa, ETHEREUM.GOERLI.CHAIN, ETHEREUM.GOERLI.PREFUNDAMT, "", paymaster)
    const wallet = new FunWallet(config, TEST_API_KEY);
    await wallet.init()
    console.log(`FunWallet Address: ${wallet.address}`)
    const module = new EoaAaveWithdrawal()
    await wallet.addModule(module)

    const modulePreExecTxs = await module.getPreExecTxs(ETHEREUM.GOERLI.ADAIADDRESS, WITHDRAW_AMOUNT)
    await wallet.deployTxs(modulePreExecTxs)
    await module.verifyRequirements(ETHEREUM.GOERLI.ADAIADDRESS, WITHDRAW_AMOUNT)
    await wallet.deploy()

    const aaveActionTx = await module.createWithdrawTx(ETHEREUM.GOERLI.ADAIADDRESS, eoa.address, WITHDRAW_AMOUNT)
    const receipt = await wallet.deployTx(aaveActionTx)

    console.log(receipt)
}


// TOKEN: 0xdc31Ee1784292379Fbb2964b3B9C4124D8F89C60 must have balance
// Must have aave v3 position set up
const paymasterSetup = async (signer) => {
    const paymasterSponsor = new PaymasterSponsor(signer)
    await paymasterSponsor.init()
    await paymasterSponsor.stakeEth(signer.address, ".1")
    await paymasterSponsor.addTokenDepositTo(walletAddress, "10")
    await paymasterSponsor.lockTokenDeposit()
    await paymasterSponsor.setWhitelistMode()
    await paymasterSponsor.deploy()
}