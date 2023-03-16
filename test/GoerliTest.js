const { expect, assert } = require("chai")
const ethers = require('ethers')
const { EoaAaveWithdrawal, TokenTransfer } = require("../src/modules/index")

const { FunWallet, FunWalletConfig } = require('../index')
const { TEST_API_KEY, getAddrBalanceErc, } = require('./TestUtils')
const { ETHEREUM } = require('./TestnetTest.config')
const { EOA_AAVE_WITHDRAWAL_MODULE_NAME, TOKEN_SWAP_MODULE_NAME } = require("../src/modules/Module")
const WITHDRAW_AMOUNT = ethers.constants.MaxInt256

//PLEASE READ 
//Steps to take before running this test
//1. Ensure your wallet has enough goerliEth to meet the prefund amount
//2. Ensure your FunWallet has enough (.001) USDC to transfer
//3. Ensure that an AAVE Dai position has been declared 


describe("Test on Goerli", function () {
    const walletTransferERC = async (wallet, to, amount, tokenAddr) => {
        const transfer = new TokenTransfer()
        await wallet.addModule(transfer)
        const transferActionTx = await transfer.createTransferTx(to, amount, tokenAddr)
        const receipt = await wallet.deployTx(transferActionTx)
        console.log(receipt)
        return receipt
    }

    let eoa, wallet
    before(async function () {
        this.timeout(60000)
        const provider = new ethers.providers.JsonRpcProvider(ETHEREUM.GOERLI.RPC)
        eoa = new ethers.Wallet(ETHEREUM.GOERLI.PRIVKEY, provider)
        console.log(`Eoa Address: ${eoa.address}`)

        const balance = await provider.getBalance(eoa.address)
        const balanceInEth = parseFloat(ethers.utils.formatEther(balance))
        console.log(`Balance of Wallet: ${balanceInEth}eth`)
        assert.isBelow(ETHEREUM.GOERLI.PREFUNDAMT, balanceInEth, `Balance of wallet is less than ${ETHEREUM.GOERLI.PREFUNDAMT}, please load up with GoerliEth in a faucet.`)

        const config = new FunWalletConfig(eoa, await eoa.getAddress(), ETHEREUM.GOERLI.CHAIN, ETHEREUM.GOERLI.PREFUNDAMT)
        wallet = new FunWallet(config, TEST_API_KEY);
        await wallet.init()
        console.log(`FunWallet Address: ${wallet.address}`)
    })
    // it("Transfer USDC", async function () {
    //     this.timeout(90000)
    //     //TODO: check USDC balance, check on chain success
    //     const funderWalletErc20BalanceStart = await getAddrBalanceErc(eoa, ETHEREUM.GOERLI.USDC_ADDR, wallet.address)
    //     const receipt = await walletTransferERC(wallet, ETHEREUM.GOERLI.TO, "100", ETHEREUM.GOERLI.USDC_ADDR) //1000000 = 1usdc
    //     expect(receipt).to.have.property('txid')
    //     const funderWalletErc20BalanceEnd = await getAddrBalanceErc(eoa, ETHEREUM.GOERLI.USDC_ADDR, wallet.address)
    //     expect(funderWalletErc20BalanceStart - funderWalletErc20BalanceEnd).to.be.lessThan(.0001001).and.greaterThan(.000099)
    // })

    it("Aave Withdrawal", async function () {
        //TODO: add faucet docs
        this.timeout(120000)

        const eoaATokenBalance = await getAddrBalanceErc(eoa, ETHEREUM.GOERLI.ADAIADDRESS, eoa.address)
        expect(eoaATokenBalance).to.not.equal("0.0", "Position not declared. Please supply an AAVE DAI position.")

        const module = new EoaAaveWithdrawal()
        await wallet.addModule(module)
        await wallet.deploy()

        const getPreExecTxs = await wallet.modules[EOA_AAVE_WITHDRAWAL_MODULE_NAME].getPreExecTxs(ETHEREUM.GOERLI.ADAIADDRESS, WITHDRAW_AMOUNT)
        wallet.deployTxs(getPreExecTxs)
        await wallet.modules[EOA_AAVE_WITHDRAWAL_MODULE_NAME].verifyRequirements(ETHEREUM.GOERLI.ADAIADDRESS, WITHDRAW_AMOUNT)

        const aaveWithdrawTx = await wallet.modules[EOA_AAVE_WITHDRAWAL_MODULE_NAME].createWithdrawTx(ETHEREUM.GOERLI.ADAIADDRESS, wallet.eoa.address, WITHDRAW_AMOUNT)
        const receipt = await wallet.deployTx(aaveWithdrawTx)

        console.log(receipt)
        const endEoaATokenBalance = await getAddrBalanceErc(eoa, ETHEREUM.GOERLI.ADAIADDRESS, eoa.address)

        expect(eoaATokenBalance - endEoaATokenBalance).to.be.greaterThan(0)

    })
})









