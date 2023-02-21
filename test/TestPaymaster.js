const { FunWallet, FunWalletConfig } = require("../index")
const { TokenSwap, TokenTransfer } = require("../src/modules")
const ethers = require('ethers')
const { transferAmt, getBalance, getUserBalanceErc, loadPaymaster, logPairing, execContractFunc, logUserPaymasterBalance, USDC_ADDR, HARDHAT_FORK_CHAIN_ID, RPC_URL, PRIV_KEY, PKEY, DAI_ADDR, API_KEY } = require("./TestUtils")
const { Token, TokenTypes } = require("../utils/Token")
const { USDCPaymaster } = require("../src/paymasters/USDCPaymaster")
const { DataServer} = require('../utils/DataServer')
let paymasterAddress 
let ROUTER_ADDR 
let entryPointAddress

const EntryPointAbi = require("../utils/abis/EntryPoint.json")
const { PaymasterSponsorInterface } = require("../src/paymasters/PaymasterSponsorInterface")
const PREFUND_AMT = 0.3
const AMOUNT = 60

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
    const tx = await swapModule.createSwapTx(tokenIn, tokenOut, AMOUNT, wallet.address, 5, 100)
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
    const swapModule = new TokenSwap()
    await wallet.addModule(swapModule)
    await wallet.deploy()

    await transferAmt(funder, wallet.address, AMOUNT)
    console.log("Wallet Eth Start Balance: ", await getBalance(wallet))

    const startWalletDAI = await getUserBalanceErc(wallet, USDC_ADDR)

    const tokenIn = { type: TokenTypes.ETH, symbol: "weth", chainId: HARDHAT_FORK_CHAIN_ID }
    const tokenOut = { type: TokenTypes.ERC20, address: USDC_ADDR }
    const tx = await swapModule.createSwapTx(tokenIn, tokenOut, AMOUNT, wallet.address)
    await wallet.deployTx(tx)

    const endWalletDAI = await getUserBalanceErc(wallet, USDC_ADDR)

    console.log("swapped for ", (endWalletDAI - startWalletDAI), " USDC")

    const outDiff = parseFloat(endWalletDAI) - parseFloat(startWalletDAI);
    logPairing(AMOUNT, outDiff, "ETH", "USDC")
}

const walletTransferERC = async (wallet, to, AMOUNT, tokenAddr) => {
    const transfer = new TokenTransfer()
    const start = await getUserBalanceErc(wallet, tokenAddr)
    console.log("Starting Wallet ERC Amount: ", start)
    await wallet.addModule(transfer)
    const transferActionTx = await transfer.createTransferTx(to, AMOUNT, { address: tokenAddr })
    await wallet.deployTx(transferActionTx)
    const end = await getUserBalanceErc(wallet, tokenAddr)
    console.log("End Wallet ERC Amount: ", end)
}

const fundUserUSDCPaymaster = async (eoa, paymasterAddr, wallet, AMOUNT) => {

    const paymasterInterface = new PaymasterSponsorInterface(eoa)
    await paymasterInterface.init()

    const paymasterContract = loadPaymaster(paymasterAddr, eoa)
    await paymasterInterface.addTokenDepositTo(wallet.address, USDCETHAMT)

    console.log("\n\n")
    await logUserPaymasterBalance(paymasterContract, wallet, "Wallet Starting: ")
    console.log("\n\n")
}


const fundPaymasterEth = async (eoa, value) => {
    const paymasterInterface = new PaymasterSponsorInterface(eoa)
    await paymasterInterface.init()

    await paymasterInterface.addEthDepositForSponsor(value, eoa.address)
    await paymasterInterface.lockTokenDeposit()
    await paymasterInterface.setWhitelistMode(true)

    const postBalance = await paymasterInterface.getEthDepositInfoForSponsor(eoa.address)
    console.log("paymasterBalance: ", postBalance.toString())
}

const getPaymasterTotalDeposit = async () => {
    const entryPointContract = new ethers.Contract(entryPointAddress, EntryPointAbi.abi, provider)
    console.log("\n\nPaymaster Total Deposit: ", await entryPointContract.balanceOf(paymasterAddress), "\n\n")
}



const main = async () => {
    await getPaymasterTotalDeposit()
    await transferAmt(funder, eoa.address, AMOUNT + 1)
    const sponsorAddress = funder.address

    const paymaster = new USDCPaymaster(paymasterAddress, sponsorAddress)
    const walletConfig = new FunWalletConfig(eoa, HARDHAT_FORK_CHAIN_ID, PREFUND_AMT, "", paymaster)
    const wallet = new FunWallet(walletConfig, API_KEY)
    await wallet.init()

    console.log("wallet balance: ", await getBalance(wallet))
    console.log("funder balance: ", await getBalance(funder))
    console.log("eoa balance: ", await getBalance(eoa))

    const swapModule = new TokenSwap()
    await wallet.addModule(swapModule)
    await wallet.deploy()
    await testEthSwap(wallet, swapModule, eoa)
    console.log("\n\nPost Transaction Paymaster State")
    await logUserPaymasterBalance(paymaster, wallet, "Smart Contract Wallet")
    await logUserPaymasterBalance(paymaster, funder, "Sponsor EOA")
    await getPaymasterTotalDeposit()

}

const postTest = async (eoa, paymasterAddr) => {
    const starteoaTokenBalance = await getUserBalanceErc(eoa, USDC_ADDR)
    console.log("\n")
    console.log("Starting EOA Token Balance: ", starteoaTokenBalance)

    const paymasterInterface = new PaymasterSponsorInterface(eoa)
    await paymasterInterface.init()

    const paymasterContract = loadPaymaster(paymasterAddr, eoa)
    const startblockNumber = await provider.getBlockNumber();
    const withdrawAmount = (await paymasterContract.depositInfo(eoa.address)).tokenAmount

    console.log('\n')

    await paymasterInterface.unlockTokenDeposit()

    await new Promise((resolve, reject) => {
        provider.on("block", (blockNumber) => {
            if (blockNumber == startblockNumber + 1) {
                resolve();
                return
            }
        })
    });

    await paymasterInterface.withdrawTokenDepositTo(eoa.address, withdrawAmount)
    provider.removeAllListeners("block")

    await logUserPaymasterBalance(paymasterContract, eoa, "End Sponsor EOA")
    const eoaTokenBalance = await getUserBalanceErc(eoa, USDC_ADDR)
    console.log("Ending EOA Token Balance: ", eoaTokenBalance)
    console.log("Total withdrew: ", eoaTokenBalance - starteoaTokenBalance)

}

const setup = async () => {
    const getData = await DataServer.getChainInfo("31337")
    paymasterAddress = getData.moduleAddresses.paymaster.paymasterAddress
    ROUTER_ADDR = getData.moduleAddresses.tokenSwap.univ3router
    entryPointAddress = getData.aaData.entryPointAddress

    const provider = new ethers.providers.JsonRpcProvider(RPC_URL)
    const walletConfig = new FunWalletConfig(eoa, HARDHAT_FORK_CHAIN_ID, PREFUND_AMT)
    const wallet = new FunWallet(walletConfig, API_KEY)
    await wallet.init()
    await getUsdcWallet(wallet, AMOUNT)
    await walletTransferERC(wallet, funder.address, USDCETHAMT, USDC_ADDR)
    await fundUserUSDCPaymaster(funder, paymasterAddress, wallet, AMOUNT)
    await fundPaymasterEth(funder, AMOUNT)
}

if (typeof require !== 'undefined' && require.main === module) {
    console.log("\n\n::::::PAYMASTER TEST::::::")

    setup().then(main).then(() => {
        postTest(funder, paymasterAddress)
    })
}