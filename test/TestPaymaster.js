const { FunWallet, FunWalletConfig } = require("../index")
const { TokenSwap, TokenTransfer } = require("../src/modules")
const ethers = require('ethers')
const { transferAmt, getBalance, getUserBalanceErc, createErc, loadPaymaster, logPairing, execContractFunc, logUserPaymasterBalance, USDC_ADDR, HARDHAT_FORK_CHAIN_ID, RPC_URL, PRIV_KEY, PKEY, DAI_ADDR, API_KEY } = require("./TestUtils")
const { Token, TokenTypes } = require("../utils/Token")
const { USDCPaymaster } = require("../src/paymasters/USDCPaymaster")

const paymasterAddress = require("./testConfig.json").paymasterAddress
const ROUTER_ADDR = require("./testConfig.json").uniswapV3RouterAddress
const PREFUND_AMT = 0.3
const AMOUNT = 60
const testConfigPath = "./testConfig.json"

const provider = new ethers.providers.JsonRpcProvider(RPC_URL)
const funder = new ethers.Wallet(PKEY, provider)
const eoa = new ethers.Wallet(PRIV_KEY, provider)

const testEthSwap = async (wallet, swapModule, eoa) => {
    console.log("ETH SWAP: ETH=>WETH=>DAI")
    await transferAmt(eoa, wallet.address, AMOUNT)
    console.log("Wallet Eth Start Balance: ", await getBalance(wallet))

    const DAI = await Token.createToken({ type: TokenTypes.ERC20, address: DAI_ADDR })
    const startWalletDAI = await getUserBalanceErc(wallet, DAI.address)

    const tokenIn = { type: TokenTypes.ETH, symbol: "weth", chainId: HARDHAT_FORK_CHAIN_ID }
    const tokenOut = { type: TokenTypes.ERC20, address: DAI.address }
    const tx = await swapModule.createSwap(tokenIn, tokenOut, AMOUNT, wallet.address, 5, 100)
    await wallet.deployTx(tx)

    const endWalletDAI = await getUserBalanceErc(wallet, DAI.address)
    const outDiff = parseFloat(endWalletDAI) - parseFloat(startWalletDAI);
    console.log("Wallet Eth End Balance: ", await getBalance(wallet))
    logPairing(AMOUNT, outDiff, "ETH", "DAI")
}

const USDCETHAMT = ethers.utils.parseUnits((1400 * AMOUNT).toString(), 6)



const getUsdcWallet = async (wallet, AMOUNT = 10) => {
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL)
    const funder = new ethers.Wallet(PKEY, provider)
    const swapModule = new TokenSwap(ROUTER_ADDR)
    await wallet.addModule(swapModule)
    await wallet.deploy()

    await transferAmt(funder, wallet.address, AMOUNT)
    console.log("Wallet Eth Start Balance: ", await getBalance(wallet))

    const startWalletDAI = await getUserBalanceErc(wallet, USDC_ADDR)

    const tokenIn = { type: TokenTypes.ETH, symbol: "weth", chainId: HARDHAT_FORK_CHAIN_ID }
    const tokenOut = { type: TokenTypes.ERC20, address: USDC_ADDR }
    const tx = await swapModule.createSwap(tokenIn, tokenOut, AMOUNT, wallet.address)
    await wallet.deployTx(tx)

    const endWalletDAI = await getUserBalanceErc(wallet, USDC_ADDR)

    console.log("swapped for ", (endWalletDAI - startWalletDAI), " USDC")
}

const walletTransferERC = async (wallet, to, AMOUNT, tokenAddr) => {
    const transfer = new TokenTransfer()
    const start = await getUserBalanceErc(wallet, tokenAddr)
    console.log("Starting Wallet ERC Amount: ", start)
    await wallet.addModule(transfer)
    const transferActionTx = await transfer.createTransfer(to, AMOUNT, { address: tokenAddr })
    await wallet.deployTx(transferActionTx)
    const end = await getUserBalanceErc(wallet, tokenAddr)
    console.log("End Wallet ERC Amount: ", end)
}

const fundUserUSDCPaymaster = async (eoa, paymasterAddr, walletaddr, AMOUNT) => {
    const usdcContract = createErc(USDC_ADDR, eoa)
    const paymasterContract = loadPaymaster(paymasterAddr, eoa)
    const approvedata = await usdcContract.populateTransaction.approve(paymasterAddr, USDCETHAMT)
    const depositData = await paymasterContract.populateTransaction.addDepositFor(walletaddr, USDCETHAMT)

    await execContractFunc(eoa, approvedata)
    await execContractFunc(eoa, depositData)
    await logUserPaymasterBalance(paymasterContract, walletaddr)
}

const fundPaymasterEth = async (eoa, paymasterAddr, value) => {
    const paymasterContract = loadPaymaster(paymasterAddr, eoa)

    const depositData = await paymasterContract.populateTransaction.addEthDepositForSponsor(eoa.address)
    const lockData = await paymasterContract.populateTransaction.lockTokenDeposit()
    const whitelistData = await paymasterContract.populateTransaction.setWhitelistMode(true)

    const tx = { ...depositData, value: ethers.utils.parseEther(value.toString()) }
    await execContractFunc(eoa, tx)
    await execContractFunc(eoa, lockData)
    await execContractFunc(eoa, whitelistData)

    const postBalance = await paymasterContract.getEthDepositInfoForSponsor(eoa.address)
    const unlockBlock = await paymasterContract.getUnlockBlock(eoa.address)
    console.log("paymasterBalance: ", postBalance.toString())
    console.log("unlock block", unlockBlock.toString())
}


const main = async () => {
    await transferAmt(funder, eoa.address, AMOUNT + 1)
    const sponsorAddress = funder.address

    const paymaster = new USDCPaymaster(paymasterAddress, sponsorAddress)
    const walletConfig = new FunWalletConfig(eoa, HARDHAT_FORK_CHAIN_ID, PREFUND_AMT, paymaster)
    const wallet = new FunWallet(walletConfig, API_KEY)
    await wallet.init()

    console.log("wallet balance: ", await getBalance(wallet))
    console.log("funder balance: ", await getBalance(funder))
    console.log("eoa balance: ", await getBalance(eoa))

    const swapModule = new TokenSwap()
    await wallet.addModule(swapModule)
    await wallet.deploy()

    await testEthSwap(wallet, swapModule, eoa)
}

const setup = async () => {
    const paymasterAddr = require(testConfigPath).paymasterAddress
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL)
    const walletConfig = new FunWalletConfig(eoa, HARDHAT_FORK_CHAIN_ID, PREFUND_AMT)
    const wallet = new FunWallet(walletConfig, API_KEY)
    await wallet.init()
    await getUsdcWallet(wallet, AMOUNT)
    await walletTransferERC(wallet, funder.address, USDCETHAMT, USDC_ADDR)
    await fundUserUSDCPaymaster(funder, paymasterAddr, wallet.address, AMOUNT)
    await fundPaymasterEth(funder, paymasterAddr, AMOUNT)
}

if (typeof require !== 'undefined' && require.main === module) {
    setup().then(main)
    // setup()
}