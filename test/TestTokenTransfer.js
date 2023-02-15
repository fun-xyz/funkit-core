const { FunWallet, configs } = require("../index")
const { FunWalletConfig } = require("../src/funWallet")
const { ApproveAndSwap, TransferToken } = require("../src/modules")
const ethers = require('ethers')

const { execTest, transferAmt, getAddrBalanceErc, getBalance, transferErc, execContractFunc, getUserBalanceErc, createErc, } = require("../utils/deploy")

const ERC20 = require("../utils/abis/ERC20.json")
const { Token } = require("../utils/Token")


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





const getEthSwapToDAI = async (wallet, swapModule, eoa) => {
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





const walletTransferERC = async (wallet, to, amount, tokenAddr) => {
    const transfer = new TransferToken()
    const start = await getUserBalanceErc(wallet, tokenAddr)
    console.log("\n")
    console.log("Starting Wallet ERC Amount: ", start)
    await wallet.addModule(transfer)
    const transferActionTx = await transfer.createTransfer(to, amount, tokenAddr)
    await wallet.deployTx(transferActionTx)
    const end = await getUserBalanceErc(wallet, tokenAddr)
    console.log("End Wallet ERC Amount: ", end)
    console.log("Difference: ", start - end)
}

const main = async () => {
    const provider = new ethers.providers.JsonRpcProvider(rpcurl)
    const eoa = new ethers.Wallet(privKey, provider)
    const funder = new ethers.Wallet(pkey, provider)

    await transferAmt(funder, eoa.address, amount + 1)

    const walletConfig = new FunWalletConfig(eoa, chain, APIKEY, prefundAmt)
    const wallet = new FunWallet(walletConfig)
    await wallet.init()


    console.log("wallet balance: ", await getBalance(wallet))
    console.log("funder balance: ", await getBalance(funder))
    console.log("eoa balance: ", await getBalance(eoa))


    const swapModule = new ApproveAndSwap(routerAddr)
    await wallet.addModule(swapModule)
    await wallet.deploy()
    await getEthSwapToDAI(wallet, swapModule, eoa)
    const funderWalletErc20BalanceStart = await getAddrBalanceErc(eoa, DAI, funder.address)
    console.log("funder starting ERC20:(DAI) balance: ", funderWalletErc20BalanceStart)

    await walletTransferERC(wallet, funder.address, ethers.utils.parseEther("2"), DAI)
    const funderWalletErc20BalanceEnd = await getAddrBalanceErc(eoa, DAI, funder.address)
    console.log("funder ending ERC20:(DAI) balance: ", funderWalletErc20BalanceEnd)
    console.log("funder ERC20:(DAI) Difference: ", funderWalletErc20BalanceEnd - funderWalletErc20BalanceStart)

    console.log("\n\n\n")

}




if (typeof require !== 'undefined' && require.main === module) {
    main()
}