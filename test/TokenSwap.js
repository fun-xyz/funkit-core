const { FunWallet, FunWalletConfig } = require("../index")
const { expect } = require("chai")
const { TokenSwap } = require("../src/modules")
const ethers = require('ethers')
const { transferAmt, getUserBalanceErc, HARDHAT_FORK_CHAIN_ID, RPC_URL, PRIV_KEY, PKEY, DAI_ADDR, TEST_API_KEY } = require("./TestUtils")
const { Token } = require("../utils/Token")
const { TOKEN_SWAP_MODULE_NAME } = require("../src/modules/Module")

describe("TokenSwap", function() {
    let eoa
    const AMOUNT = 60
    const PREFUND_AMT = 0.3

    before(async function() {
        const provider = new ethers.providers.JsonRpcProvider(RPC_URL)
        eoa = new ethers.Wallet(PRIV_KEY, provider)
        const funder = new ethers.Wallet(PKEY, provider)

        await transferAmt(funder, eoa.address, AMOUNT + 1)
    })

    it("succeed case", async function() {
        this.timeout(30000)
        const walletConfig = new FunWalletConfig(eoa, await eoa.getAddress(), HARDHAT_FORK_CHAIN_ID, PREFUND_AMT)
        const wallet = new FunWallet(walletConfig, TEST_API_KEY)
        await wallet.init()

        const swapModule = new TokenSwap()
        await wallet.addModule(swapModule)
        await wallet.deploy()
        
        await transferAmt(eoa, wallet.address, AMOUNT)

        const startWalletDAI = await getUserBalanceErc(wallet, DAI_ADDR)
        
        const tokenIn = new Token({ symbol: "eth", chainId: HARDHAT_FORK_CHAIN_ID })
        const tokenOut = new Token({ address: DAI_ADDR, chainId: HARDHAT_FORK_CHAIN_ID })
        const createSwapTx = await wallet.modules[TOKEN_SWAP_MODULE_NAME].createSwapTx(tokenIn, tokenOut, AMOUNT, wallet.address, 5, 100)
        await wallet.deployTx(createSwapTx)
        
        const endWalletDAI = await getUserBalanceErc(wallet, DAI_ADDR)
        expect(parseFloat(endWalletDAI) - parseFloat(startWalletDAI)).to.be.greaterThan(0)
    })
})