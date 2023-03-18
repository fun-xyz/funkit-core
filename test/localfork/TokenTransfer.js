const { FunWallet, FunWalletConfig } = require("../../index")
const { TokenSwap, TokenTransfer } = require("../../src/modules")
const { expect } = require("chai")
const ethers = require('ethers')
const { transferAmt, getAddrBalanceErc, HARDHAT_FORK_CHAIN_KEY, RPC_URL, PRIV_KEY, PKEY, DAI_ADDR, TEST_API_KEY } = require("../TestUtils")

describe("TokenTransfer", function() {
    let eoa
    let funder
    const AMOUNT = 60
    const PREFUND_AMT = 0.3

    async function getEthSwapToDAI(wallet, swapModule, eoa, amount) {
        // ETH SWAP: ETH=>WETH=>DAI
        await transferAmt(eoa, wallet.address, amount)
        const tx = await swapModule.createSwapTx("eth", DAI_ADDR, amount, wallet.address, 5, 100)
        await wallet.deployTx(tx)
    }
    
    async function walletTransferERC(wallet, to, amount, tokenAddr) {
        const transfer = new TokenTransfer()
        await wallet.addModule(transfer)
        const transferActionTx = await transfer.createTransferTx(to, amount, tokenAddr)
        await wallet.deployTx(transferActionTx)
    }
    
    before(async function() {
        const provider = new ethers.providers.JsonRpcProvider(RPC_URL)
        eoa = new ethers.Wallet(PRIV_KEY, provider)
        funder = new ethers.Wallet(PKEY, provider)
        await transferAmt(funder, eoa.address, AMOUNT + 1)
        
    })

    it("succeed case", async function() {
        this.timeout(30000)
        const walletConfig = new FunWalletConfig(eoa, HARDHAT_FORK_CHAIN_KEY, PREFUND_AMT)
        const wallet = new FunWallet(walletConfig, TEST_API_KEY)
        await wallet.init()
    
        const swapModule = new TokenSwap()
        await wallet.addModule(swapModule)
        await wallet.deploy()
        await getEthSwapToDAI(wallet, swapModule, eoa, AMOUNT)

        const transferNum = 5
        const funderWalletErc20BalanceStart = await getAddrBalanceErc(eoa, DAI_ADDR, funder.address)
        await walletTransferERC(wallet, funder.address, ethers.utils.parseEther(transferNum.toString()), DAI_ADDR)
        const funderWalletErc20BalanceEnd = await getAddrBalanceErc(eoa, DAI_ADDR, funder.address)
        expect(Math.floor(funderWalletErc20BalanceEnd - funderWalletErc20BalanceStart)).to.be.equal(transferNum)
    })
})