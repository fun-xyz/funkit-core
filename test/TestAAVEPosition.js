const { FunWalletConfig } = require("../src/funWallet")
const { EoaAaveWithdrawal, ApproveAndSwap, TransferToken } = require("../src/modules/index")
const { FunWallet } = require("../index")
const { transferAmt, getAddrBalanceErc, timeout, getBalance, execContractFunc, getUserBalanceErc, createErc, getAllowanceErc, } = require("../utils/deploy")

const ethers = require('ethers')

const PRIV_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"

const CHAIN = 31337 // avax fuji 

const DAI = "0x6B175474E89094C44Da98b954EedeAC495271d0F"
const aDAI = "0x018008bfb33d285247A21d44E50697654f754e63"
const routerAddr = "0xE592427A0AEce92De3Edee1F18E0157C05861564"
const POOL_ADDRESS = "0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9"


const PREFUND_AMT = 0.3

const APIKEY = "hnHevQR0y394nBprGrvNx4HgoZHUwMet5mXTOBhf"
const RPC_URL = "http://127.0.0.1:8545"

const TOKEN_ADDRESS = DAI
const GET_RESERVE_DATA_ABI = [
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "asset",
                "type": "address"
            }
        ],
        "name": "getReserveData",
        "outputs": [
            {
                "components": [
                    {
                        "components": [
                            {
                                "internalType": "uint256",
                                "name": "data",
                                "type": "uint256"
                            }
                        ],
                        "internalType": "struct DataTypes.ReserveConfigurationMap",
                        "name": "configuration",
                        "type": "tuple"
                    },
                    {
                        "internalType": "uint128",
                        "name": "liquidityIndex",
                        "type": "uint128"
                    },
                    {
                        "internalType": "uint128",
                        "name": "variableBorrowIndex",
                        "type": "uint128"
                    },
                    {
                        "internalType": "uint128",
                        "name": "currentLiquidityRate",
                        "type": "uint128"
                    },
                    {
                        "internalType": "uint128",
                        "name": "currentVariableBorrowRate",
                        "type": "uint128"
                    },
                    {
                        "internalType": "uint128",
                        "name": "currentStableBorrowRate",
                        "type": "uint128"
                    },
                    {
                        "internalType": "uint40",
                        "name": "lastUpdateTimestamp",
                        "type": "uint40"
                    },
                    {
                        "internalType": "address",
                        "name": "aTokenAddress",
                        "type": "address"
                    },
                    {
                        "internalType": "address",
                        "name": "stableDebtTokenAddress",
                        "type": "address"
                    },
                    {
                        "internalType": "address",
                        "name": "variableDebtTokenAddress",
                        "type": "address"
                    },
                    {
                        "internalType": "address",
                        "name": "interestRateStrategyAddress",
                        "type": "address"
                    },
                    {
                        "internalType": "uint8",
                        "name": "id",
                        "type": "uint8"
                    }
                ],
                "internalType": "struct DataTypes.ReserveData",
                "name": "",
                "type": "tuple"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
]
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


const UNDERLYING_ASSET_ABI = [{
    "inputs": [],
    "name": "UNDERLYING_ASSET_ADDRESS",
    "outputs": [
        {
            "internalType": "address",
            "name": "",
            "type": "address"
        }
    ],
    "stateMutability": "view",
    "type": "function"
},]


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

const getAtokenAddress = async (eoa, tokenAddress) => {
    const poolIface = new ethers.Contract(POOL_ADDRESS, GET_RESERVE_DATA_ABI, eoa)
    return await poolIface.getReserveData(tokenAddress)
}

const getUnderlyingAsset = async (eoa, atokenAddress) => {
    const atokenIface = new ethers.Contract(atokenAddress, UNDERLYING_ASSET_ABI, eoa)
    return await atokenIface.UNDERLYING_ASSET_ADDRESS()
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
    const eoaDaiBalanceFormat = await getAddrBalanceErc(eoa.provider, tokenAddr, eoa.address)
    await eoaSupplyAave(eoa, (eoaDaiBalance), tokenAddr)
    const endEoaDaiBalance = await getAddrBalanceErc(eoa.provider, tokenAddr, eoa.address)
    console.log("Supplied: ", (eoaDaiBalanceFormat - endEoaDaiBalance), "tokens")

}

const mainTest = async (wallet, tokenAddr) => {
    // Create a FunWallet with the above access control schema, prefunded with PREFUND_AMT AVAXa
    const module = new EoaAaveWithdrawal()

    await wallet.addModule(module)

    const modulePreExecTxs = await module.getPreExecTxs(tokenAddr)
    await wallet.deployTxs(modulePreExecTxs)
    console.log("pre transaction status success: ", await module.verifyRequirements(tokenAddr))

    const deployWalletReceipt = await wallet.deploy()
    console.log("Creation Succesful:\n", deployWalletReceipt.receipt)

    const aaveActionTx = await module.createWithdraw(tokenAddr, wallet.eoa.address)

    const withdrawReceipt = await wallet.deployTx(aaveActionTx)
    console.log("Execution Succesful:\n", withdrawReceipt)
}



const amount = 10;
const main = async (PRIV_KEY, PREFUND_AMT, APIKEY, RPC_URL) => {
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL)
    const eoa = new ethers.Wallet(PRIV_KEY, provider)
    const walletConfig = new FunWalletConfig(eoa, CHAIN, APIKEY, PREFUND_AMT)
    const wallet = new FunWallet(walletConfig)
    await wallet.init()
    await setUpWithdrawEOA(eoa, wallet, amount, TOKEN_ADDRESS)

    console.log("Waiting for block to pass.")
    await timeout(12000)

    const { aTokenAddress } = await getAtokenAddress(eoa, TOKEN_ADDRESS)
    const baseTokenAddress = await getUnderlyingAsset(eoa, aTokenAddress)

    const eoaTokenBalance = await getAddrBalanceErc(eoa, baseTokenAddress, eoa.address)
    const eoaATokenBalance = await getAddrBalanceErc(eoa, aTokenAddress, eoa.address)

    await mainTest(wallet, aTokenAddress)

    const endEoaTokenBalance = await getAddrBalanceErc(eoa, baseTokenAddress, eoa.address)
    const endEoaATokenBalance = await getAddrBalanceErc(eoa, aTokenAddress, eoa.address)
    const walletATokenBalance = await getAddrBalanceErc(eoa, aTokenAddress, wallet.address)
    const walletAllowance = await getAllowanceErc(eoa, aTokenAddress, eoa.address, wallet.address)

    console.log("Started with: ", (eoaTokenBalance), "Tokens")
    console.log("Has: ", (endEoaTokenBalance), "Tokens")

    console.log("Withdrew: ", (eoaATokenBalance - endEoaATokenBalance), "ATokens")
    console.log("Has: ", (endEoaATokenBalance), "ATokens")
    console.log("\n\n\n")
}




main(PRIV_KEY, PREFUND_AMT, APIKEY, RPC_URL)




