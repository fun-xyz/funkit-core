const { FunWallet, FunWalletConfig } = require("../../index")
const { TokenSwap, TokenTransfer } = require("../../src/modules")
const { expect } = require("chai")
const ethers = require('ethers')
const { transferAmt, getUserBalanceErc, USDC_ADDR, HARDHAT_FORK_CHAIN_ID, RPC_URL, PRIV_KEY, PKEY, DAI_ADDR, TEST_API_KEY } = require("./TestUtils")
const { Token } = require("../../utils/Token")
const { USDCPaymaster } = require("../../src/paymasters/USDCPaymaster")
const { DataServer} = require('../../utils/DataServer')
const paymasterdata = require("../../utils/abis/TokenPaymaster.json")
const { PaymasterSponsorInterface } = require("../../src/paymasters/PaymasterSponsorInterface")
const { TOKEN_SWAP_MODULE_NAME } = require("../../src/modules/Module")

describe("Paymaster", function() {
    let eoa
    let funder
    let provider
    let paymasterAddress

    const PREFUND_AMT = 0.3
    const AMOUNT = 60

    const USDCETHAMT = ethers.utils.parseUnits((1400 * AMOUNT).toString(), 6)

    function loadPaymaster(address, provider) {
        return new ethers.Contract(address, paymasterdata.abi, provider)
    }

    async function getUsdcForWallet(wallet, amount) {
        const swapModule = new TokenSwap()
        await wallet.addModule(swapModule)
        await wallet.deploy()
    
        await transferAmt(funder, wallet.address, amount)
    
        const startWalletUSDC = await getUserBalanceErc(wallet, USDC_ADDR)

        const tokenIn = new Token({ symbol: "eth", chainId: HARDHAT_FORK_CHAIN_ID })
        const tokenOut = new Token({ address: USDC_ADDR, chainId: HARDHAT_FORK_CHAIN_ID })
        const createSwapTx = await wallet.modules[TOKEN_SWAP_MODULE_NAME].createSwapTx(tokenIn, tokenOut, amount, wallet.address)
        await wallet.deployTx(createSwapTx)
    
        const endWalletUSDC = await getUserBalanceErc(wallet, USDC_ADDR)
    
        expect(parseFloat(endWalletUSDC) - parseFloat(startWalletUSDC)).to.be.greaterThan(0)
    }

    async function walletTransferERC(wallet, to, amount, tokenAddr) {
        const transfer = new TokenTransfer()
        await wallet.addModule(transfer)
        const createTransferTx = await wallet.createTransferTx(to, amount, tokenAddr)
        await wallet.deployTx(createTransferTx)
    }

    async function getPaymasterBalance(paymasterObj, wallet) {
        const paymaster = paymasterObj instanceof ethers.Contract ? paymasterObj : loadPaymaster(paymasterObj.paymasterAddr, wallet.provider ? wallet.provider : wallet.eoa.provider)
        return await paymaster.depositInfo(wallet.address)
    }

    async function fundUserUSDCPaymaster(eoa, paymasterAddr, wallet) {
        const paymasterInterface = new PaymasterSponsorInterface(eoa)
        await paymasterInterface.init()
    
        const paymasterContract = loadPaymaster(paymasterAddr, eoa)
        await paymasterInterface.addTokenDepositTo(wallet.address, USDCETHAMT)
        
        const data = await getPaymasterBalance(paymasterContract, wallet)

        expect(data.tokenAmount.toNumber()).to.be.greaterThanOrEqual(USDCETHAMT.toNumber())
    }

    async function fundPaymasterEth(eoa, value) {
        const paymasterInterface = new PaymasterSponsorInterface(eoa)
        await paymasterInterface.init()
    
        await paymasterInterface.addEthDepositForSponsor(value, eoa.address)
        await paymasterInterface.lockTokenDeposit()
        await paymasterInterface.setWhitelistMode(true)
    }

    async function testEthSwap(wallet, eoa) {
        await transferAmt(eoa, wallet.address, AMOUNT)
        const startWalletDAI = await getUserBalanceErc(wallet, DAI_ADDR)
    
        const tokenIn = new Token({ symbol: "eth", chainId: HARDHAT_FORK_CHAIN_ID })
        const tokenOut = new Token({ address: DAI_ADDR, chainId: HARDHAT_FORK_CHAIN_ID })
        const createSwapTx = await wallet.modules[TOKEN_SWAP_MODULE_NAME].createSwapTx(tokenIn, tokenOut, AMOUNT, wallet.address, 5, 100)
        await wallet.deployTx(createSwapTx)
    
        const endWalletDAI = await getUserBalanceErc(wallet, DAI_ADDR)
        expect(parseFloat(endWalletDAI) - parseFloat(startWalletDAI)).to.be.greaterThan(0)
    }

    before(async function() {
        this.timeout(30000)
        provider = new ethers.providers.JsonRpcProvider(RPC_URL)
        eoa = new ethers.Wallet(PRIV_KEY, provider)
        funder = new ethers.Wallet(PKEY, provider)

        const getData = await DataServer.getChainInfo(HARDHAT_FORK_CHAIN_ID)
        paymasterAddress = getData.moduleAddresses.paymaster.paymasterAddress
        entryPointAddress = getData.aaData.entryPointAddress
    
        const walletConfig = new FunWalletConfig(eoa, await eoa.getAddress(), HARDHAT_FORK_CHAIN_ID, PREFUND_AMT)
        const wallet = new FunWallet(walletConfig, TEST_API_KEY)
        await wallet.init()

        await getUsdcForWallet(wallet, AMOUNT)
        await walletTransferERC(wallet, funder.address, USDCETHAMT, USDC_ADDR)
        await fundUserUSDCPaymaster(funder, paymasterAddress, wallet)
        await fundPaymasterEth(funder, AMOUNT)
    })

    it("succeed case", async function() {
        this.timeout(30000)
        const paymasterInterface = new PaymasterSponsorInterface(funder)
        await paymasterInterface.init()

        await transferAmt(funder, eoa.address, AMOUNT + 1)
        
        const paymaster = new USDCPaymaster(paymasterAddress, funder.address)
        const walletConfig = new FunWalletConfig(eoa, await eoa.getAddress(), HARDHAT_FORK_CHAIN_ID, PREFUND_AMT, "", paymaster)
        const wallet = new FunWallet(walletConfig, TEST_API_KEY)
        await wallet.init()

        const startWalletPaymasterUSDC = (await paymasterInterface.depositInfo(wallet.address)).tokenAmount
        const startFunderPaymasterUSDC = (await paymasterInterface.depositInfo(funder.address)).tokenAmount
        const startFunderPaymasterETH = (await paymasterInterface.depositInfo(funder.address)).sponsorAmount
    
        // execute a transaction
        const swapModule = new TokenSwap()
        await wallet.addModule(swapModule)
        await wallet.deploy()

        await testEthSwap(wallet, eoa)

        // verify paymaster works
        const endWalletPaymasterUSDC = (await paymasterInterface.depositInfo(wallet.address)).tokenAmount
        const endFunderPaymasterUSDC = (await paymasterInterface.depositInfo(funder.address)).tokenAmount
        const endFunderPaymasterETH = (await paymasterInterface.depositInfo(funder.address)).sponsorAmount

        expect((startWalletPaymasterUSDC.sub(endWalletPaymasterUSDC)).toNumber()).to.be.greaterThan(0)
        expect((endFunderPaymasterUSDC.sub(startFunderPaymasterUSDC)).toNumber()).to.be.greaterThan(0)
        expect((startFunderPaymasterETH.sub(endFunderPaymasterETH)).toNumber()).to.be.greaterThan(0)
    })
})