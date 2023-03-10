const { FunWallet, FunWalletConfig } = require("../index")
const { TokenSwap, TokenTransfer } = require("../src/modules")
const { expect } = require("chai")
const ethers = require('ethers')
const { transferAmt, getUserBalanceErc, USDC_ADDR, HARDHAT_FORK_CHAIN_ID, HARDHAT_FORK_CHAIN_NAME, RPC_URL, PRIV_KEY, PKEY, DAI_ADDR, TEST_API_KEY } = require("./TestUtils")
const { Token } = require("../utils/Token")
const { DataServer } = require('../utils/DataServer')
const paymasterdata = require("../utils/abis/TokenPaymaster.json")
const { PaymasterSponsor } = require("../src/paymasters/PaymasterSponsor")
const { TokenPaymaster } = require("../src/paymasters")



describe("Paymaster", function () {
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

        const tokenIn = new Token({ symbol: "eth", chainId: wallet.config.chain_id })
        const tokenOut = new Token({ address: USDC_ADDR, chainId: wallet.config.chain_id })
        const tx = await swapModule.createSwapTx(tokenIn, tokenOut, amount, wallet.address)
        await wallet.deployTx(tx)

        const endWalletUSDC = await getUserBalanceErc(wallet, USDC_ADDR)

        expect(parseFloat(endWalletUSDC) - parseFloat(startWalletUSDC)).to.be.greaterThan(0)
    }

    async function walletTransferERC(wallet, to, amount, tokenAddr) {
        const transfer = new TokenTransfer()
        await wallet.addModule(transfer)
        const transferActionTx = await transfer.createTransferTx(to, amount, tokenAddr)
        await wallet.deployTx(transferActionTx)
    }

    async function getPaymasterBalance(paymasterObj, wallet) {
        const paymaster = paymasterObj instanceof ethers.Contract ? paymasterObj : loadPaymaster(paymasterObj.paymasterAddr, wallet.provider ? wallet.provider : wallet.eoa.provider)
        return await paymaster.depositInfo(wallet.address)
    }

    async function fundUserUSDCPaymaster(eoa, paymasterAddr, wallet) {
        const paymasterInterface = new PaymasterSponsor(eoa)
        await paymasterInterface.init()
        await paymasterInterface.addTokenDepositTo(wallet.address, USDCETHAMT)
        await paymasterInterface.deploy()
        const paymasterContract = loadPaymaster(paymasterAddr, eoa)

        const data = await getPaymasterBalance(paymasterContract, wallet)

        expect(data.tokenAmount.toNumber()).to.be.greaterThanOrEqual(USDCETHAMT.toNumber())
    }

    async function fundPaymasterEth(eoa, value) {
        const paymasterInterface = new PaymasterSponsor(eoa)
        await paymasterInterface.init()

        await paymasterInterface.stakeEth(eoa.address, value)
        await paymasterInterface.lockTokenDeposit()
        await paymasterInterface.setWhitelistMode()
        await paymasterInterface.deploy()
    }

    async function testEthSwap(wallet, swapModule, eoa) {
        await transferAmt(eoa, wallet.address, AMOUNT)
        const startWalletDAI = await getUserBalanceErc(wallet, DAI_ADDR)

        const tokenIn = new Token({ symbol: "eth", chainId: HARDHAT_FORK_CHAIN_ID })
        const tokenOut = new Token({ address: DAI_ADDR, chainId: HARDHAT_FORK_CHAIN_ID })
        const tx = await swapModule.createSwapTx(tokenIn, tokenOut, AMOUNT, wallet.address, 5, 100)
        await wallet.deployTx(tx)

        const endWalletDAI = await getUserBalanceErc(wallet, DAI_ADDR)
        expect(parseFloat(endWalletDAI) - parseFloat(startWalletDAI)).to.be.greaterThan(0)
    }

    before(async function () {
        this.timeout(10000)
        provider = new ethers.providers.JsonRpcProvider(RPC_URL)
        eoa = new ethers.Wallet(PRIV_KEY, provider)
        funder = new ethers.Wallet(PKEY, provider)

        const getData = await DataServer.getChainInfo(HARDHAT_FORK_CHAIN_ID)
        paymasterAddress = getData.moduleAddresses.paymaster.paymasterAddress
        entryPointAddress = getData.aaData.entryPointAddress

        const walletConfig = new FunWalletConfig(eoa, HARDHAT_FORK_CHAIN_ID, PREFUND_AMT)
        const wallet = new FunWallet(walletConfig, TEST_API_KEY)
        await wallet.init()

        await getUsdcForWallet(wallet, AMOUNT)
        await walletTransferERC(wallet, funder.address, USDCETHAMT, USDC_ADDR)
        await fundUserUSDCPaymaster(funder, paymasterAddress, wallet)
        await fundPaymasterEth(funder, AMOUNT)
    })

    it("succeed case", async function () {
        this.timeout(10000)
        const paymasterInterface = new PaymasterSponsor(funder)
        await paymasterInterface.init()

        await transferAmt(funder, eoa.address, AMOUNT + 1)

        const paymaster = new TokenPaymaster(funder.address, HARDHAT_FORK_CHAIN_ID)
        const walletConfig = new FunWalletConfig(eoa, HARDHAT_FORK_CHAIN_ID, PREFUND_AMT, "", paymaster)
        const wallet = new FunWallet(walletConfig, TEST_API_KEY)
        await wallet.init()

        const startWalletPaymasterUSDC = (await paymasterInterface.depositInfo(wallet.address)).tokenAmount
        const startFunderPaymasterUSDC = (await paymasterInterface.depositInfo(funder.address)).tokenAmount
        const startFunderPaymasterETH = (await paymasterInterface.depositInfo(funder.address)).sponsorAmount

        // execute a transaction
        const swapModule = new TokenSwap()
        await wallet.addModule(swapModule)
        await wallet.deploy()

        await testEthSwap(wallet, swapModule, eoa)

        // verify paymaster works
        const endWalletPaymasterUSDC = (await paymasterInterface.depositInfo(wallet.address)).tokenAmount
        const endFunderPaymasterUSDC = (await paymasterInterface.depositInfo(funder.address)).tokenAmount
        const endFunderPaymasterETH = (await paymasterInterface.depositInfo(funder.address)).sponsorAmount

        expect((startWalletPaymasterUSDC.sub(endWalletPaymasterUSDC)).toNumber()).to.be.greaterThan(0)
        expect((endFunderPaymasterUSDC.sub(startFunderPaymasterUSDC)).toNumber()).to.be.greaterThan(0)
        expect((startFunderPaymasterETH.sub(endFunderPaymasterETH)).toNumber()).to.be.greaterThan(0)
    })
})