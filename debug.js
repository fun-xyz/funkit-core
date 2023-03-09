const { FunWallet, FunWalletConfig } = require("./index")
const { TokenSwap, TokenTransfer } = require("./src/modules")
const ethers = require('ethers')
const { transferAmt, getUserBalanceErc, USDC_ADDR, HARDHAT_FORK_CHAIN_ID, RPC_URL, PRIV_KEY, PKEY, DAI_ADDR, TEST_API_KEY } = require("./test/TestUtils")
const { Token } = require("./utils/Token")
const { USDCPaymaster } = require("./src/paymasters/USDCPaymaster")
const { DataServer } = require('./utils/DataServer')
const paymasterdata = require("./utils/abis/TokenPaymaster.json")
const { PaymasterInterface } = require("./src/paymasters/PaymasterInterface")


const PREFUND_AMT = 0.3
const AMOUNT = 60

const USDCETHAMT = ethers.utils.parseUnits((1400 * AMOUNT).toString(), 6)

const main = async () => {
    provider = new ethers.providers.JsonRpcProvider(RPC_URL)
    eoa = new ethers.Wallet(PRIV_KEY, provider)
    funder = new ethers.Wallet(PKEY, provider)

    const getData = await DataServer.getChainInfo(HARDHAT_FORK_CHAIN_ID)
    const paymasterAddress = getData.moduleAddresses.paymaster.paymasterAddress
    const entryPointAddress = getData.aaData.entryPointAddress

    const walletConfig = new FunWalletConfig(eoa, HARDHAT_FORK_CHAIN_ID, PREFUND_AMT)
    const wallet = new FunWallet(walletConfig, TEST_API_KEY)
    await wallet.init()

    await getUsdcForWallet(wallet, AMOUNT)
    console.log("usdc")
    await walletTransferERC(wallet, funder.address, USDCETHAMT, USDC_ADDR)
    console.log("trasnfered")
    await fundUserUSDCPaymaster(funder, paymasterAddress, wallet)
    console.log("usdc funded")
    await fundPaymasterEth(funder, AMOUNT)
    console.log("eth funded")
}


async function getUsdcForWallet(wallet, amount) {
    const swapModule = new TokenSwap()
    await wallet.addModule(swapModule)
    await wallet.deploy()

    await transferAmt(funder, wallet.address, amount)

    const startWalletUSDC = await getUserBalanceErc(wallet, USDC_ADDR)

    const tokenIn = new Token({ symbol: "eth", chainId: HARDHAT_FORK_CHAIN_ID })
    const tokenOut = new Token({ address: USDC_ADDR, chainId: HARDHAT_FORK_CHAIN_ID })
    const tx = await swapModule.createSwapTx(tokenIn, tokenOut, amount, wallet.address)
    await wallet.deployTx(tx)

    const endWalletUSDC = await getUserBalanceErc(wallet, USDC_ADDR)
}

async function walletTransferERC(wallet, to, amount, tokenAddr) {
    const transfer = new TokenTransfer()
    await wallet.addModule(transfer)
    const transferActionTx = await transfer.createTransferTx(to, amount, tokenAddr)
    await wallet.deployTx(transferActionTx)
}

async function fundUserUSDCPaymaster(eoa, paymasterAddr, wallet) {
    const paymasterInterface = new PaymasterInterface(eoa)
    await paymasterInterface.init()
    await paymasterInterface.addTokenDepositTo(wallet.address, USDCETHAMT)
    await paymasterInterface.deploy()

}

async function fundPaymasterEth(eoa, value) {
    const paymasterInterface = new PaymasterInterface(eoa)
    await paymasterInterface.init()

    const startFunderPaymasterETH = (await paymasterInterface.depositInfo(funder.address)).sponsorAmount
    await paymasterInterface.addEthDepositForSponsor(value, eoa.address)
    await paymasterInterface.addEthDepositForSponsor(value, ethers.constants.AddressZero)
    await paymasterInterface.lockTokenDeposit()
    await paymasterInterface.setWhitelistMode(true)
    await paymasterInterface.deploy()
    const endFunderPaymasterETH = (await paymasterInterface.depositInfo(funder.address)).sponsorAmount
    const endFunderPaymasterETH0 = (await paymasterInterface.depositInfo(ethers.constants.AddressZero)).sponsorAmount

    console.log(startFunderPaymasterETH, endFunderPaymasterETH, endFunderPaymasterETH0)
}


main()