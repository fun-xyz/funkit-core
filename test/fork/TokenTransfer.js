const { FunWallet, FunWalletConfig } = require("../../index")
const { TokenSwap, TokenTransfer } = require("../../src/modules")
const { expect } = require("chai")
const ethers = require('ethers')
const { transferAmt, getAddrBalanceErc, REMOTE_FORK_CHAIN_KEY, LOCAL_FORK_CHAIN_KEY, REMOTE_FORK_RPC_URL, LOCAL_FORK_RPC_URL, PRIV_KEY, PKEY, DAI_ADDR, TEST_API_KEY } = require("../TestUtils")

describe("TokenTransfer", function() {
    let eoa
    let funder
    const AMOUNT = 60
    const PREFUND_AMT = 0.3
    var REMOTE_FORK_TEST = process.env.REMOTE_FORK_TEST;
    const FORK_CHAIN_KEY = REMOTE_FORK_TEST === 'true' ? REMOTE_FORK_CHAIN_KEY : LOCAL_FORK_CHAIN_KEY
    const RPC_URL = REMOTE_FORK_TEST === 'true' ? REMOTE_FORK_RPC_URL : LOCAL_FORK_RPC_URL

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
    
    before(async function () {
        this.timeout(30000)
        const provider = new ethers.providers.JsonRpcProvider(RPC_URL)
        eoa = new ethers.Wallet(PRIV_KEY, provider)
        funder = new ethers.Wallet(PKEY, provider)
        await transferAmt(funder, eoa.address, AMOUNT + 1)
    })

    it("succeed case", async function() {
        this.timeout(50000)
        const walletConfig = new FunWalletConfig(eoa, FORK_CHAIN_KEY, PREFUND_AMT)
        const wallet = new FunWallet(walletConfig, TEST_API_KEY)
        await wallet.init()
    
        const swapModule = new TokenSwap()
        await wallet.addModule(swapModule)
        await wallet.deploy()
        await getEthSwapToDAI(wallet, swapModule, eoa, AMOUNT)
        expect(parseInt(await getAddrBalanceErc(eoa, DAI_ADDR, wallet.address), 10)).to.be.greaterThan(0)

        const transferNum = 5
        const funderWalletErc20BalanceStart = await getAddrBalanceErc(eoa, DAI_ADDR, funder.address)
        await walletTransferERC(wallet, funder.address, ethers.utils.parseEther(transferNum.toString()), DAI_ADDR)
        const funderWalletErc20BalanceEnd = await getAddrBalanceErc(eoa, DAI_ADDR, funder.address)
        expect(Math.floor(funderWalletErc20BalanceEnd - funderWalletErc20BalanceStart)).to.be.equal(transferNum)
    })
})