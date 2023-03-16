const { FunWalletConfig } = require("../index")
const { EoaAaveWithdrawal, TokenSwap } = require("../src/modules/index")
const { FunWallet } = require("../index")
const { expect } = require("chai")
const { transferAmt, getAddrBalanceErc, execContractFunc, getUserBalanceErc, createErc, HARDHAT_FORK_CHAIN_ID, HARDHAT_FORK_CHAIN_KEY,
    RPC_URL, PRIV_KEY, PKEY, DAI_ADDR, TEST_API_KEY } = require("./TestUtils")
const ethers = require('ethers')
const { Token, TokenTypes } = require("../utils/Token")

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


describe("AaveWithDrawal", function () {
    let provider
    let eoa
    let funder
    let wallet

    const amount = 10
    const POOL_ADDRESS = "0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9"
    const PREFUND_AMT = 0.3
    const TOKEN_ADDRESS = DAI_ADDR
    const WITHDRAW_AMOUNT = ethers.constants.MaxInt256

    async function eoaSupplyAave(eoa, amount, tokenAddr) {
        const tokenContract = createErc(tokenAddr, eoa)
        const approveData = await tokenContract.populateTransaction.approve(POOL_ADDRESS, amount)
        const contract = new ethers.Contract(POOL_ADDRESS, SUPPLY_ABI, eoa)
        const txData = await contract.populateTransaction.deposit(tokenAddr, amount, eoa.address, 0)
        await execContractFunc(eoa, approveData)
        await execContractFunc(eoa, txData)
    }

    async function walletEthToERC20Swap(wallet, eoa, amount, tokenAddr, returnAddress = "") {
        const swapModule = new TokenSwap()
        await wallet.addModule(swapModule)
        await wallet.deploy()
        await transferAmt(eoa, wallet.address, amount)

        await getUserBalanceErc(wallet, tokenAddr)
        const tx = await swapModule.createSwapTx("eth", tokenAddr, amount, returnAddress, 5, 100)
        await wallet.deployTx(tx)

        await getUserBalanceErc(wallet, tokenAddr)
    }

    async function getAtokenAddress(eoa, tokenAddress) {
        const poolIface = new ethers.Contract(POOL_ADDRESS, GET_RESERVE_DATA_ABI, eoa)
        return await poolIface.getReserveData(tokenAddress)
    }

    async function setUpWithdrawEOA(eoa, wallet, amount, tokenAddr) {
        await walletEthToERC20Swap(wallet, eoa, amount, tokenAddr, eoa.address)
        const eoaDaiBalance = await getAddrBalanceErc(eoa.provider, tokenAddr, eoa.address, false)
        await eoaSupplyAave(eoa, (eoaDaiBalance), tokenAddr)
    }

    before(async function () {
        this.timeout(20000)
        provider = new ethers.providers.JsonRpcProvider(RPC_URL)
        eoa = new ethers.Wallet(PRIV_KEY, provider)
        funder = new ethers.Wallet(PKEY, provider)
        await transferAmt(funder, eoa.address, amount + 1)
        const walletConfig = new FunWalletConfig(eoa, HARDHAT_FORK_CHAIN_KEY, PREFUND_AMT)
        wallet = new FunWallet(walletConfig, TEST_API_KEY)
        await wallet.init()
        await setUpWithdrawEOA(eoa, wallet, amount, TOKEN_ADDRESS)
    })

    it("succeed case", async function () {
        this.timeout(30000)
        await transferAmt(funder, eoa.address, amount + 1)
        const walletConfig = new FunWalletConfig(eoa, HARDHAT_FORK_CHAIN_KEY, PREFUND_AMT)
        const wallet = new FunWallet(walletConfig, TEST_API_KEY)
        await wallet.init()

        const { aTokenAddress } = await getAtokenAddress(eoa, TOKEN_ADDRESS)
        const eoaATokenBalance = await getAddrBalanceErc(eoa, aTokenAddress, eoa.address)


        const module = new EoaAaveWithdrawal()
        await wallet.addModule(module)

        const modulePreExecTxs = await module.getPreExecTxs(aTokenAddress, WITHDRAW_AMOUNT)
        await wallet.deployTxs(modulePreExecTxs)
        await module.verifyRequirements(aTokenAddress, WITHDRAW_AMOUNT)
        await wallet.deploy()

        const aaveActionTx = await module.createWithdrawTx(aTokenAddress, wallet.eoa.address, WITHDRAW_AMOUNT)
        await wallet.deployTx(aaveActionTx)

        const endEoaATokenBalance = await getAddrBalanceErc(eoa, aTokenAddress, eoa.address)

        expect(eoaATokenBalance - endEoaATokenBalance).to.be.greaterThan(0)
    })
})