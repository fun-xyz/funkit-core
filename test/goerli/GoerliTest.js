const { expect, assert } = require("chai")
const ethers = require('ethers')
const { EoaAaveWithdrawal, TokenTransfer, TokenSwap } = require("../../src/modules/index")

const { FunWallet, FunWalletConfig } = require('../../index')
const { TEST_API_KEY, getAddrBalanceErc, } = require('../localfork/TestUtils')
const { ETHEREUM } = require('../TestnetTest.config')
const { Token } = require("../../utils/Token")
const { USDCPaymaster } = require("../../src/paymasters/USDCPaymaster")
const { PaymasterSponsorInterface } = require("../../src/paymasters/PaymasterSponsorInterface")


const { EOA_AAVE_WITHDRAWAL_MODULE_NAME, TOKEN_SWAP_MODULE_NAME } = require("../../src/modules/Module")
const WITHDRAW_AMOUNT = ethers.constants.MaxInt256

//PLEASE READ 
//Steps to take before running this test
//1. Ensure your wallet has enough goerliEth to meet the prefund amount
//2. Ensure your FunWallet has enough (.001) USDC to transfer
//3. Ensure that an AAVE Dai position has been declared 
//4. Make sure your FunWallet has enough Eth to perform a swap

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

    // it("Aave Withdrawal", async function () {
    //     //TODO: add faucet docs
    //     this.timeout(120000)

    //     const eoaATokenBalance = await getAddrBalanceErc(eoa, ETHEREUM.GOERLI.ADAIADDRESS, eoa.address)
    //     expect(eoaATokenBalance).to.not.equal("0.0", "Position not declared. Please supply an AAVE DAI position.")

    //     const module = new EoaAaveWithdrawal()
    //     await wallet.addModule(module)
    //     await wallet.deploy()

    //     const getPreExecTxs = await wallet.modules[EOA_AAVE_WITHDRAWAL_MODULE_NAME].getPreExecTxs(ETHEREUM.GOERLI.ADAIADDRESS, WITHDRAW_AMOUNT)
    //     wallet.deployTxs(getPreExecTxs)
    //     await wallet.modules[EOA_AAVE_WITHDRAWAL_MODULE_NAME].verifyRequirements(ETHEREUM.GOERLI.ADAIADDRESS, WITHDRAW_AMOUNT)

    //     const aaveWithdrawTx = await wallet.modules[EOA_AAVE_WITHDRAWAL_MODULE_NAME].createWithdrawTx(ETHEREUM.GOERLI.ADAIADDRESS, wallet.eoa.address, WITHDRAW_AMOUNT)
    //     const receipt = await wallet.deployTx(aaveWithdrawTx)

    //     console.log(receipt)
    //     const endEoaATokenBalance = await getAddrBalanceErc(eoa, ETHEREUM.GOERLI.ADAIADDRESS, eoa.address)

    //     expect(eoaATokenBalance - endEoaATokenBalance).to.be.greaterThan(0)

    // })
    it("Token Swap", async function(){
        this.timeout(60000)
        const swapModule = new TokenSwap()
        await wallet.addModule(swapModule)
        await wallet.deploy()
        
        const startWalletDAI = await getAddrBalanceErc(eoa, ETHEREUM.GOERLI.DAIADDRESS, wallet.address)
        
        const tokenIn = new Token({ symbol: "eth", chainId: ETHEREUM.GOERLI.CHAIN })
        const tokenOut = new Token({ address: ETHEREUM.GOERLI.DAIADDRESS, chainId: ETHEREUM.GOERLI.CHAIN })
        const createSwapTx = await wallet.modules[TOKEN_SWAP_MODULE_NAME].createSwapTx(tokenIn, tokenOut, .01, wallet.address, 5, 100)
        const receipt = await wallet.deployTx(createSwapTx)
        console.log(receipt)
        const endWalletDAI = await getAddrBalanceErc(eoa, ETHEREUM.GOERLI.DAIADDRESS, wallet.address)

        expect(parseFloat(endWalletDAI) - parseFloat(startWalletDAI)).to.be.greaterThan(0)
    })





    // const USDCETHAMT = ethers.utils.parseUnits((1400 * AMOUNT).toString(), 6)

    // function loadPaymaster(address, provider) {
    //     return new ethers.Contract(address, paymasterdata.abi, provider)
    // }

    // async function getUsdcForWallet(wallet, amount) {
    //     const swapModule = new TokenSwap()
    //     await wallet.addModule(swapModule)
    //     await wallet.deploy()
    
    //     await transferAmt(funder, wallet.address, amount)
    
    //     const startWalletUSDC = await getUserBalanceErc(wallet, USDC_ADDR)

    //     const tokenIn = new Token({ symbol: "eth", chainId: HARDHAT_FORK_CHAIN_ID })
    //     const tokenOut = new Token({ address: USDC_ADDR, chainId: HARDHAT_FORK_CHAIN_ID })
    //     const createSwapTx = await wallet.modules[TOKEN_SWAP_MODULE_NAME].createSwapTx(tokenIn, tokenOut, amount, wallet.address)
    //     await wallet.deployTx(createSwapTx)
    
    //     const endWalletUSDC = await getUserBalanceErc(wallet, USDC_ADDR)
    
    //     expect(parseFloat(endWalletUSDC) - parseFloat(startWalletUSDC)).to.be.greaterThan(0)
    // }

    // async function walletTransferERC(wallet, to, amount, tokenAddr) {
    //     const transfer = new TokenTransfer()
    //     await wallet.addModule(transfer)
    //     const createTransferTx = await wallet.createTransferTx(to, amount, tokenAddr)
    //     await wallet.deployTx(createTransferTx)
    // }

    // async function getPaymasterBalance(paymasterObj, wallet) {
    //     const paymaster = paymasterObj instanceof ethers.Contract ? paymasterObj : loadPaymaster(paymasterObj.paymasterAddr, wallet.provider ? wallet.provider : wallet.eoa.provider)
    //     return await paymaster.depositInfo(wallet.address)
    // }

    // async function fundUserUSDCPaymaster(eoa, paymasterAddr, wallet) {
    //     const paymasterInterface = new PaymasterSponsorInterface(eoa)
    //     await paymasterInterface.init()
    
    //     const paymasterContract = loadPaymaster(paymasterAddr, eoa)
    //     await paymasterInterface.addTokenDepositTo(wallet.address, USDCETHAMT)
        
    //     const data = await getPaymasterBalance(paymasterContract, wallet)

    //     expect(data.tokenAmount.toNumber()).to.be.greaterThanOrEqual(USDCETHAMT.toNumber())
    // }

    // async function fundPaymasterEth(eoa, value) {
    //     const paymasterInterface = new PaymasterSponsorInterface(eoa)
    //     await paymasterInterface.init()
    
    //     await paymasterInterface.addEthDepositForSponsor(value, eoa.address)
    //     await paymasterInterface.lockTokenDeposit()
    //     await paymasterInterface.setWhitelistMode(true)
    // }

    // async function testEthSwap(wallet, eoa) {
    //     await transferAmt(eoa, wallet.address, AMOUNT)
    //     const startWalletDAI = await getUserBalanceErc(wallet, DAI_ADDR)
    
    //     const tokenIn = new Token({ symbol: "eth", chainId: HARDHAT_FORK_CHAIN_ID })
    //     const tokenOut = new Token({ address: DAI_ADDR, chainId: HARDHAT_FORK_CHAIN_ID })
    //     const createSwapTx = await wallet.modules[TOKEN_SWAP_MODULE_NAME].createSwapTx(tokenIn, tokenOut, AMOUNT, wallet.address, 5, 100)
    //     await wallet.deployTx(createSwapTx)
    
    //     const endWalletDAI = await getUserBalanceErc(wallet, DAI_ADDR)
    //     expect(parseFloat(endWalletDAI) - parseFloat(startWalletDAI)).to.be.greaterThan(0)
    // }

    // it("Paymaster", async function(){
    //     this.timeout(120000)

    //     const paymasterInterface = new PaymasterSponsorInterface(funder)
    //     await paymasterInterface.init()
        
    //     const paymaster = new USDCPaymaster(paymasterAddress, funder.address)
    //     const walletConfig = new FunWalletConfig(eoa, await eoa.getAddress(), HARDHAT_FORK_CHAIN_ID, PREFUND_AMT, "", paymaster)
    //     const wallet = new FunWallet(walletConfig, TEST_API_KEY)
    //     await wallet.init()

    //     const startWalletPaymasterUSDC = (await paymasterInterface.depositInfo(wallet.address)).tokenAmount
    //     const startFunderPaymasterUSDC = (await paymasterInterface.depositInfo(funder.address)).tokenAmount
    //     const startFunderPaymasterETH = (await paymasterInterface.depositInfo(funder.address)).sponsorAmount
    
    //     // execute a transaction
    //     const swapModule = new TokenSwap()
    //     await wallet.addModule(swapModule)
    //     await wallet.deploy()

    //     await testEthSwap(wallet, eoa)

    //     // verify paymaster works
    //     const endWalletPaymasterUSDC = (await paymasterInterface.depositInfo(wallet.address)).tokenAmount
    //     const endFunderPaymasterUSDC = (await paymasterInterface.depositInfo(funder.address)).tokenAmount
    //     const endFunderPaymasterETH = (await paymasterInterface.depositInfo(funder.address)).sponsorAmount

    //     expect((startWalletPaymasterUSDC.sub(endWalletPaymasterUSDC)).toNumber()).to.be.greaterThan(0)
    //     expect((endFunderPaymasterUSDC.sub(startFunderPaymasterUSDC)).toNumber()).to.be.greaterThan(0)
    //     expect((startFunderPaymasterETH.sub(endFunderPaymasterETH)).toNumber()).to.be.greaterThan(0)
    // })
    

})









