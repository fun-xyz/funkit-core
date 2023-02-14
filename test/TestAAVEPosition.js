const { FunWalletConfig } = require("../utils/configs/walletConfigs")
const { EoaAaveWithdrawal, ApproveAndSwap, TransferToken } = require("../src/modules/index")
const { FunWallet } = require("../index")
const { execTest, transferAmt, getAddrBalanceErc, getBalance, transferErc, execContractFunc, getUserBalanceErc, createErc, getAllowanceErc, } = require("../utils/deploy")

const ethers = require('ethers')
const { Token } = require("../utils/Token")

const CHAIN = 31337 // avax fuji 

const DAI = "0x6B175474E89094C44Da98b954EedeAC495271d0F"
const aDAI = "0x028171bCA77440897B824Ca71D1c56caC55b68A3"
const routerAddr = "0xE592427A0AEce92De3Edee1F18E0157C05861564"

const POOL_ADDRESS = "0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9"

const supplyAbi = [{
    "inputs": [
        {
            "internalType": "address",
            "name": "asset",
            "type": "address"
        },
        {
            "internalType": "uint256",
            "name": "amount",
            "type": "uint256"
        },
        {
            "internalType": "address",
            "name": "onBehalfOf",
            "type": "address"
        },
        {
            "internalType": "uint16",
            "name": "referralCode",
            "type": "uint16"
        }
    ],
    "name": "deposit",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
}]

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

const walletEthToERC20Swap = async (wallet, eoa, amount, tokenAddr, returnAddress = "") => {
    const swapModule = new ApproveAndSwap(routerAddr)
    await wallet.addModule(swapModule)
    await wallet.deploy()
    await transferAmt(eoa, wallet.address, amount)
    console.log("Wallet Eth Start Balance: ", await getBalance(wallet))

    const startWalletDAI = await getUserBalanceErc(wallet, tokenAddr)

    const tx = await swapModule.createSwap("eth", tokenAddr, amount, returnAddress)
    const execReceipt = await wallet.deployTx(tx)

    const endWalletDAI = await getUserBalanceErc(wallet, tokenAddr)

    const outDiff = parseFloat(endWalletDAI) - parseFloat(startWalletDAI);
    console.log("Wallet Eth End Balance: ", await getBalance(wallet))
}

const eoaSupplyAave = async (eoa, amount, tokenAddr) => {
    const tokenContract = createErc(tokenAddr, eoa)
    const approveData = await tokenContract.populateTransaction.approve(POOL_ADDRESS, amount)
    const contract = new ethers.Contract(POOL_ADDRESS, supplyAbi, eoa)
    const txData = await contract.populateTransaction.deposit(tokenAddr, amount, eoa.address, 0)
    await execContractFunc(eoa, approveData)
    await execContractFunc(eoa, txData)
}


const setUpWithdrawEOA = async (eoa, wallet, amount, tokenAddr) => {
    await walletEthToERC20Swap(wallet, eoa, amount, tokenAddr, eoa.address)
    const eoaDaiBalance = await getAddrBalanceErc(eoa.provider, tokenAddr, eoa.address, false)
    await eoaSupplyAave(eoa, (eoaDaiBalance), tokenAddr)
    const endEoaDaiBalance = await getAddrBalanceErc(eoa.provider, tokenAddr, eoa.address, false)
    console.log("Supplied: ", (eoaDaiBalance - endEoaDaiBalance), "tokens")

}

const mainTest = async (wallet, tokenAddr) => {
    // Create a FunWallet with the above access control schema, prefunded with prefundAmt AVAXa
    const module = new EoaAaveWithdrawal()

    await wallet.addModule(module)

    const modulePreExecTxs = await module.getPreExecTxs(tokenAddr)
    console.log(modulePreExecTxs)
    await wallet.deployTxs(modulePreExecTxs)
    console.log("pre transaction status success: ", await module.verifyRequirements(tokenAddr))

    const deployWalletReceipt = await wallet.deploy()
    console.log("Creation Succesful:\n", deployWalletReceipt.receipt)

    const aaveActionTx = await module.createWithdraw(tokenAddr)

    const withdrawReceipt = await wallet.deployTx(aaveActionTx)
    console.log("Execution Succesful:\n", withdrawReceipt)
}

const amount = 10;
const main = async (privKey, prefundAmt, APIKEY, rpcurl) => {
    const provider = new ethers.providers.JsonRpcProvider(rpcurl)
    const eoa = new ethers.Wallet(privKey, provider)
    const walletConfig = new FunWalletConfig(eoa, CHAIN, APIKEY, prefundAmt)
    const wallet = new FunWallet(walletConfig)
    await wallet.init()
    await setUpWithdrawEOA(eoa, wallet, amount, tokenAddr)
    const eoaATokenBalance = await getAddrBalanceErc(eoa, atokenAddr, eoa.address)
    await mainTest(wallet, atokenAddr)
    const endEoaATokenBalance = await getAddrBalanceErc(eoa, atokenAddr, eoa.address)
    const endWalletATokenBalance = await getAddrBalanceErc(eoa, atokenAddr, wallet.address)
    const endWalletATokenallowance = await getAllowanceErc(eoa, atokenAddr, eoa.address, wallet.address)

    console.log("Withdrew: ", (eoaATokenBalance - endEoaATokenBalance), "tokens")
    console.log("Has: ", (endEoaATokenBalance), "tokens")
    console.log("Wallet: ", (endWalletATokenBalance), "tokens")
    console.log("Wallet: ", (endWalletATokenallowance), "allowance")

}

const processConsole = () => {
    const [tokenAddr, privKey, prefundAmt, APIKEY, rpcurl] = process.argv.slice(2)
}


const privKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
const prefundAmt = 0.3
const APIKEY = "hnHevQR0y394nBprGrvNx4HgoZHUwMet5mXTOBhf"
const rpcurl = "http://127.0.0.1:8545"


const tokenAddr = DAI
const atokenAddr = aDAI


main(privKey, prefundAmt, APIKEY, rpcurl)
// processConsole()




