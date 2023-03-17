const { expect, assert } = require("chai")
const ethers = require('ethers')
const { EoaAaveWithdrawal, TokenTransfer, TokenSwap } = require("../../src/modules/index")

const { FunWallet, FunWalletConfig } = require('../../index')
const { TEST_API_KEY, getAddrBalanceErc, } = require('../TestUtils')
const { ETHEREUM } = require('../TestnetTest.config')
const { Token } = require("../../utils/Token")
const { USDCPaymaster } = require("../../src/paymasters/USDCPaymaster")
const { PaymasterSponsorInterface } = require("../../src/paymasters/PaymasterSponsorInterface")


const { EOA_AAVE_WITHDRAWAL_MODULE_NAME, TOKEN_SWAP_MODULE_NAME } = require("../../src/modules/Module")
const WITHDRAW_AMOUNT = ethers.constants.MaxInt256

//PLEASE READ 
//Steps to take before running this test
//1. Ensure your wallet has enough goerliEth to meet the prefund amount
//2. Make sure your FunWallet has enough Eth to perform a swap

describe("Token swap", function () {
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
    it("succeed case", async function(){
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

})









