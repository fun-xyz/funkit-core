// abis
import IUniswapV3PoolABI from "@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json"
import { padHex } from "viem"
import APPROVE_AND_EXEC_CONTRACT from "../abis/ApproveAndExec.json"
import APPROVE_AND_SWAP_CONTRACT from "../abis/ApproveAndSwap.json"
import ENTRYPOINT_CONTRACT from "../abis/EntryPoint.json"
import ERC20_CONTRACT from "../abis/ERC20.json"
import ERC_721_CONTRACT from "../abis/ERC721.json"
import FUN_WALLET_CONTRACT from "../abis/FunWallet.json"
import FACTORY_CONTRACT from "../abis/FunWalletFactory.json"
import GASLESS_PAYMASTER_CONTRACT from "../abis/GaslessPaymaster.json"
import WITHDRAW_QUEUE_CONTRACT from "../abis/LidoWithdrawQueue.json"
import OFF_CHAIN_ORACLE_CONTRACT from "../abis/OffChainOracle.json"
import TOKEN_PAYMASTER_CONTRACT from "../abis/TokenPaymaster.json"
import { ContractInterface } from "../viem/ContractInterface"
// local fork environment

export const LOCAL_FORK_CHAIN_ID = 31337
export const LOCAL_FORK_CHAIN_KEY = "ethereum-localfork"
export const LOCAL_FORK_RPC_URL = "http://127.0.0.1:8545"
export const LOCAL_API_URL = "http://127.0.0.1:3000"
export const LOCAL_TOKEN_ADDRS = {
    usdc: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    usdt: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    dai: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
    weth: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
}
export const FORK_DEFAULT_ADDRESSES = {
    "1inchOracleAddress": "0x07D91f5fb9Bf7798734C3f606dB065549F6893bb"
}

// fun testnet environment
export const FUN_TESTNET_CHAIN_ID = 36864
export const FUN_TESTNET_CHAIN_KEY = "fun-testnet"
export const FUN_TESTNET_RPC_URL = "http://34.221.214.161:3001"

// prod
let API_URL

switch (process.env.NODE_ENV) {
    case "staging":
        API_URL = "https://api.fun.xyz/staging"
        break
    case "internal":
        API_URL = "https://api.fun.xyz/internal"
        break
    default:
        API_URL = "https://api.fun.xyz"
}

export { API_URL }

export const DASHBOARD_API_URL = "https://zl8bx9p7f4.execute-api.us-west-2.amazonaws.com/Prod"
export const BASE_WRAP_TOKEN_ADDR = {
    "1": {
        weth: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
    },
    "5": {
        weth: "0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6"
    },
    "137": {
        wmatic: "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270"
    },
    "43113": {
        weth: "0x1D308089a2D1Ced3f1Ce36B1FcaF815b07217be3"
    },
    "42161": {
        weth: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1"
    }
}

export const AddressZero = padHex("0x", { size: 20 })
export const HashZero = padHex("0x", { size: 32 })

export const TEST_API_KEY = "localtest"
export const OPTION_TEST_API_KEY = "nbiQS2Ut932ewF5TqiCpl2ZTUqPWb1P29N8GcJjy"
export const TRANSACTION_TYPE = "FunWalletInteraction"

export const APPROVE_AND_EXEC_ABI = APPROVE_AND_EXEC_CONTRACT.abi
export const APPROVE_AND_SWAP_ABI = APPROVE_AND_SWAP_CONTRACT.abi
export const ENTRYPOINT_ABI = ENTRYPOINT_CONTRACT.abi
export const ERC20_ABI = ERC20_CONTRACT.abi
export const WALLET_ABI = FUN_WALLET_CONTRACT.abi
export const FACTORY_ABI = FACTORY_CONTRACT.abi
export const GASLESS_PAYMASTER_ABI = GASLESS_PAYMASTER_CONTRACT.abi
export const OFF_CHAIN_ORACLE_ABI = OFF_CHAIN_ORACLE_CONTRACT.abi
export const TOKEN_PAYMASTER_ABI = TOKEN_PAYMASTER_CONTRACT.abi
export const WITHDRAW_QUEUE_ABI = WITHDRAW_QUEUE_CONTRACT.abi
export const ERC_721_ABI = ERC_721_CONTRACT.abi

export const entrypointContractInterface = new ContractInterface(ENTRYPOINT_ABI)
export const erc721ContractInterface = new ContractInterface(ERC_721_ABI)
export const erc20ContractInterface = new ContractInterface(ERC20_ABI)
export const factoryContractInterface = new ContractInterface(FACTORY_ABI)
export const gaslessPaymasterContractInterface = new ContractInterface(GASLESS_PAYMASTER_ABI)
export const tokenPaymasterContractInterface = new ContractInterface(TOKEN_PAYMASTER_ABI)
export const walletContractInterface = new ContractInterface(WALLET_ABI)
export const poolContractInterface = new ContractInterface(IUniswapV3PoolABI.abi)
export const approveAndExecContractInterface = new ContractInterface(APPROVE_AND_EXEC_ABI)
