const { FunWalletConfig } = require("../index")
const { EoaAaveWithdrawal, TokenSwap } = require("../src/modules/index")
const { FunWallet } = require("../index")
const { transferAmt, getAddrBalanceErc, getBalance, execContractFunc, getUserBalanceErc,
    createErc, HARDHAT_FORK_CHAIN_ID, RPC_URL, PRIV_KEY, PKEY, DAI_ADDR, API_KEY } = require("./TestUtils")
const ethers = require('ethers')
const { TokenTypes } = require("../utils/Token")

const POOL_ADDRESS = "0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9"
const PREFUND_AMT = 0.3
const TOKEN_ADDRESS = DAI_ADDR
const WITHDRAW_AMOUNT = ethers.constants.MaxInt256

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

const SUPPLY_ABI = [{
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

const walletEthToERC20Swap = async (wallet, eoa, amount, tokenAddr, returnAddress = "") => {
    const swapModule = new TokenSwap()
    await wallet.addModule(swapModule)
    await wallet.deploy()
    await transferAmt(eoa, wallet.address, amount)
    console.log("Wallet Eth Start Balance: ", await getBalance(wallet))

    await getUserBalanceErc(wallet, tokenAddr)
    const tokenIn = {type: TokenTypes.ETH, symbol :"weth", chainId: HARDHAT_FORK_CHAIN_ID}
    const tokenOut = {type: TokenTypes.ERC20, address: tokenAddr}
    const tx = await swapModule.createSwap(tokenIn, tokenOut, amount, returnAddress, 5, 100)
    await wallet.deployTx(tx)

    await getUserBalanceErc(wallet, tokenAddr)
    const EndWalletErcTokenBalance = await getUserBalanceErc(wallet, tokenAddr)

    console.log("Wallet Eth End Balance: ", await getBalance(wallet))
    console.log("Wallet Token End Balance: ", EndWalletErcTokenBalance)
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
    const contract = new ethers.Contract(POOL_ADDRESS, SUPPLY_ABI, eoa)
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

    const modulePreExecTxs = await module.getPreExecTxs(tokenAddr, WITHDRAW_AMOUNT)
    await wallet.deployTxs(modulePreExecTxs)
    console.log("pre transaction status success: ", await module.verifyRequirements(tokenAddr, WITHDRAW_AMOUNT))

    const deployWalletReceipt = await wallet.deploy()
    console.log("Creation Succesful:\n", deployWalletReceipt.receipt)

    const aaveActionTx = await module.createWithdraw(tokenAddr, wallet.eoa.address, WITHDRAW_AMOUNT)

    const withdrawReceipt = await wallet.deployTx(aaveActionTx)
    console.log("Execution Succesful:\n", withdrawReceipt)
}

const amount = 10;
const setup = async () => {
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL)
    const eoa = new ethers.Wallet(PRIV_KEY, provider)
    const funder = new ethers.Wallet(PKEY, provider)
    await transferAmt(funder, eoa.address, amount)
    const walletConfig = new FunWalletConfig(eoa, HARDHAT_FORK_CHAIN_ID, PREFUND_AMT)
    const wallet = new FunWallet(walletConfig, API_KEY)
    await wallet.init()
    await setUpWithdrawEOA(eoa, wallet, amount, TOKEN_ADDRESS)
}

const main = async () => {
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL)
    const eoa = new ethers.Wallet(PRIV_KEY, provider)
    const funder = new ethers.Wallet(PKEY, provider)
    await transferAmt(funder, eoa.address, amount + 1)
    const walletConfig = new FunWalletConfig(eoa, HARDHAT_FORK_CHAIN_ID, PREFUND_AMT)
    const wallet = new FunWallet(walletConfig, API_KEY)
    await wallet.init()

    const { aTokenAddress } = await getAtokenAddress(eoa, TOKEN_ADDRESS)
    const baseTokenAddress = await getUnderlyingAsset(eoa, aTokenAddress)

    const eoaTokenBalance = await getAddrBalanceErc(eoa, baseTokenAddress, eoa.address)
    const eoaATokenBalance = await getAddrBalanceErc(eoa, aTokenAddress, eoa.address)

    await mainTest(wallet, aTokenAddress)

    const endEoaTokenBalance = await getAddrBalanceErc(eoa, baseTokenAddress, eoa.address)
    const endEoaATokenBalance = await getAddrBalanceErc(eoa, aTokenAddress, eoa.address)

    console.log("Started with: ", (eoaTokenBalance), "Tokens")
    console.log("Has: ", (endEoaTokenBalance), "Tokens")

    console.log("Withdrew: ", (eoaATokenBalance - endEoaATokenBalance), "ATokens")
    console.log("Has: ", (endEoaATokenBalance), "ATokens")
}


if (typeof require !== 'undefined' && require.main === module) {
    setup().then(main)
}