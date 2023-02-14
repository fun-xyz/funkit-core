const { FunWallet, configs } = require("../index")
const { FunWalletConfig } = configs
const { ApproveAndSwap, TransferToken } = require("../src/modules")
const ethers = require('ethers')

const { execTest, transferAmt, getAddrBalanceErc, getBalance, transferErc, execContractFunc, getUserBalanceErc, createErc, } = require("../utils/deploy")

const ERC20 = require("../utils/abis/ERC20.json")
const { Token, TokenTypes } = require("../utils/Token")



const APIKEY = "hnHevQR0y394nBprGrvNx4HgoZHUwMet5mXTOBhf"
const chain = "31337"
const rpcurl = "http://127.0.0.1:8545"

const prefundAmt = 0.3

const amount = 60

const routerAddr = "0xE592427A0AEce92De3Edee1F18E0157C05861564"
const privKey = "0x66f37ee92a08eebb5da72886f3c1280d5d1bd5eb8039f52fdb8062df7e364206"
const pkey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"

const USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const DAI = "0x6B175474E89094C44Da98b954EedeAC495271d0F";


const logTest = (test) => {
    console.log("\n\n" + test + "\n\n")
}


const testERCPair = async (wallet, swapModule, eoa) => {
    logTest("ERC SWAP: DAI=>USDC")
    // await transferErc(eoa, USDC, wallet.address, amount)
    let startWalletDai = await getUserBalanceErc(wallet, DAI)
    let startWallet = await getUserBalanceErc(wallet, USDC)
    console.log("Wallet Start Balance DAI: ", startWalletDai)
    console.log("Wallet Start Balance USDC: ", startWallet)

    const tx = await swapModule.createSwap(DAI, USDC, amount)
    const execReceipt = await wallet.deployTx(tx)

    let endWallet = await getUserBalanceErc(wallet, USDC)
    console.log("Wallet End Balance: ", endWallet)

    const outDiff = parseFloat(endWallet) - parseFloat(startWallet);
    logPairing(amount, outDiff, "DAI", "USDC");
}



const testEthSwap = async (wallet, swapModule, eoa) => {
    logTest("ETH SWAP: ETH=>WETH=>DAI")
    await transferAmt(eoa, wallet.address, amount)
    console.log("Wallet Eth Start Balance: ", await getBalance(wallet))

    const DAI = await Token.createFrom("0x6B175474E89094C44Da98b954EedeAC495271d0F")

    const startWalletDAI = await getUserBalanceErc(wallet, DAI.address)

    const tx = await swapModule.createSwap("eth", DAI, amount)
    const execReceipt = await wallet.deployTx(tx)

    const endWalletDAI = await getUserBalanceErc(wallet, DAI.address)

    const outDiff = parseFloat(endWalletDAI) - parseFloat(startWalletDAI);
    console.log("Wallet Eth End Balance: ", await getBalance(wallet))
    logPairing(amount, outDiff, "ETH", "DAI")
}

const logPairing = (amount, outDiff, tok1, tok2) => {
    console.log(`${tok1}/${tok2} = ${outDiff / amount}`)
}

const paymasterdata = require("../utils/abis/TokenPaymaster.json")
const loadPaymaster = (address, provider) => {
    return new ethers.Contract(address, paymasterdata.abi, provider)
}

const fundPaymasterEth = async (eoa, paymasterAddr, value) => {
    const paymasterContract = loadPaymaster(paymasterAddr, eoa)

    const depositData = await paymasterContract.populateTransaction.deposit()
    const tx = { ...depositData, value: ethers.utils.parseEther(value.toString()) }
    await execContractFunc(eoa, tx)

    const postBalance = await paymasterContract.getDeposit()
    console.log("paymasterBalance: ", postBalance.toString())
}

const fundUserUSDCPaymaster = async (wallet, eoa, paymasterAddr, walletaddr) => {
    const amount = 10000000

    await walletTransferERC(wallet, eoa.address, amount, USDC)

    const usdcContract = createErc(USDC, eoa)
    const paymasterContract = loadPaymaster(paymasterAddr, eoa)

    const approvedata = await usdcContract.populateTransaction.approve(paymasterAddr, amount)
    const depositData = await paymasterContract.populateTransaction.addDepositFor(walletaddr, amount)

    await execContractFunc(eoa, approvedata)
    await execContractFunc(eoa, depositData)
    await logUserPaymasterBalance(paymasterContract, walletaddr)
}



const logUserPaymasterBalance = async (paymaster, wallet, note = "") => {
    const data = await paymaster.depositInfo(wallet)
    console.log(note, "user paymaster balance: ", data.amount.toString())
}

const walletTransferERC = async (wallet, to, amount, tokenAddr) => {
    const transfer = new TransferToken()
    const start = await getUserBalanceErc(wallet, tokenAddr)
    console.log("Starting Wallet ERC Amount: ", start)
    await wallet.addModule(transfer)
    const transferActionTx = await transfer.createTransfer(to, amount, tokenAddr)
    await wallet.deployTx(transferActionTx)
    const end = await getUserBalanceErc(wallet, tokenAddr)
    console.log("End Wallet ERC Amount: ", end)
}
const main = async () => {
    const provider = new ethers.providers.JsonRpcProvider(rpcurl)
    const eoa = new ethers.Wallet(privKey, provider)
    const funder = new ethers.Wallet(pkey, provider)

    const paymasterAddr = ""
    // const paymasterAddr = "0x4f42528B7bF8Da96516bECb22c1c6f53a8Ac7312"
    // const paymaster = loadPaymaster(paymasterAddr, eoa)
    await transferAmt(funder, eoa.address, amount)

    const walletConfig = new FunWalletConfig(eoa, chain, APIKEY, prefundAmt, paymasterAddr, "caleb")
    const wallet = new FunWallet(walletConfig)
    await wallet.init()

    // await logUserPaymasterBalance(paymaster, wallet.address, "Pre Transaction")


    console.log("wallet balance: ", await getBalance(wallet))
    console.log("funder balance: ", await getBalance(funder))
    console.log("eoa balance: ", await getBalance(eoa))

    // await fundUserUSDCPaymaster(wallet, eoa, paymasterAddr, wallet.address)
    // await fundPaymasterEth(eoa, paymasterAddr, 1)


    const swapModule = new ApproveAndSwap(routerAddr)
    await wallet.addModule(swapModule)
    await wallet.deploy()

    await testEthSwap(wallet, swapModule, eoa)
    // await testERCPair(wallet, swapModule, eoa)

    // await logUserPaymasterBalance(paymaster, wallet.address, "Post Transaction")

}




if (typeof require !== 'undefined' && require.main === module) {

    main()
}

    // const preDeploy = await wallet.contracts[wallet.address].callMethod("getModuleStateVal", [swapModule.actionAddr])
    // const postDeploy = await wallet.contracts[wallet.address].callMethod("getModuleStateVal", [swapModule.actionAddr])
    // console.log(preDeploy)
    // console.log(postDeploy)
