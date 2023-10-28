import IUniswapV3PoolABI from "@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json"
import { padHex } from "viem"
import APPROVE_AND_EXEC_CONTRACT from "../abis/ApproveAndExec.json"
import APPROVE_AND_SWAP_CONTRACT from "../abis/ApproveAndSwap.json"
import ENTRYPOINT_CONTRACT from "../abis/EntryPoint.json"
import ERC20_CONTRACT from "../abis/ERC20.json"
import ERC_721_CONTRACT from "../abis/ERC721.json"
import ESTIMATION_PAYMASTER_CONTRACT from "../abis/EstimationPaymaster.json"
import FEE_PERCENT_ORACLE_CONTRACT from "../abis/FeePercentOracle.json"
import FUN_WALLET_CONTRACT from "../abis/FunWallet.json"
import FACTORY_CONTRACT from "../abis/FunWalletFactory.json"
import GASLESS_PAYMASTER_CONTRACT from "../abis/GaslessPaymaster.json"
import WITHDRAW_QUEUE_CONTRACT from "../abis/LidoWithdrawQueue.json"
import ROLE_BASED_ACCESS_CONTROL_CONTRACT from "../abis/RoleBasedAccessControl.json"
import TEST_NFT_CONTRACT from "../abis/TestNFT.json"
import TOKEN_PAYMASTER_CONTRACT from "../abis/TokenPaymaster.json"
import TOKEN_PRICE_ORACLE_CONTRACT from "../abis/TokenPriceOracle.json"
import UNISWAPV2FACTORY_CONTRACT from "../abis/UniswapV2Factory.json"
import UNISWAPV2ROUTER02_CONTRACT from "../abis/UniswapV2Router02.json"
import UNISWAP_V3_LIMIT_ORDER_CONTRACT from "../abis/UniswapV3LimitOrder.json"
import UNIV3_FACTORY from "../abis/univ3factory.json"
import UNIV3_QUOTER from "../abis/univ3quoter.json"
import UNIV3_ROUTER from "../abis/univ3router.json"
import USER_AUTHENTICATION_CONTRACT from "../abis/UserAuthentication.json"
import { ContractInterface } from "../viem/ContractInterface"

// local environment
export const LOCAL_API_URL = "http://127.0.0.1:3000"

// prod
let API_URL = "https://api.fun.xyz/v1"

switch (process.env.NODE_ENV) {
    case "staging":
        API_URL = "https://api.fun.xyz/staging/v1"
        break
    case "testing":
        API_URL = "https://api.fun.xyz/testing/v1"
        break
    case "local":
        API_URL = LOCAL_API_URL
        break
}

export { API_URL }

export const DASHBOARD_API_URL = "https://api.fun.xyz/dashboard"
export const BASE_WRAP_TOKEN_ADDR = {
    "1": {
        weth: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
    },
    "5": {
        weth: "0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6"
    },
    "10": {
        weth: "0x4200000000000000000000000000000000000006"
    },
    "137": {
        wmatic: "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270"
    },
    "8453": {
        weth: "0x4200000000000000000000000000000000000006"
    },
    "36865": {
        weth: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
    },
    "42161": {
        weth: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1"
    },
    "43113": {
        weth: "0x1D308089a2D1Ced3f1Ce36B1FcaF815b07217be3"
    }
}

// When update this, also remember to update the address in api service
export const FUN_GASLESS_SPONSOR_ADDRESS = "0xCB5D0b4569A39C217c243a436AC3feEe5dFeb9Ad"
export const FUN_TOKEN_SPONSOR_ADDRESS = "0x40C0cCa76088D45106c2D74D0B4B6405865f22De"

export const TOKEN_SPONSOR_SUPPORT_CHAINS = ["1", "5", "10", "137", "8453", "42161"]
export const GASLESS_SPONSOR_SUPPORT_CHAINS = ["5"]

export const AddressZero = padHex("0x", { size: 20 })
export const HashZero = padHex("0x", { size: 32 })

// abis
export const APPROVE_AND_EXEC_ABI = APPROVE_AND_EXEC_CONTRACT["abi"]
export const APPROVE_AND_SWAP_ABI = APPROVE_AND_SWAP_CONTRACT["abi"]
export const ENTRYPOINT_ABI = ENTRYPOINT_CONTRACT["abi"]
export const ERC20_ABI = ERC20_CONTRACT["abi"]
export const WALLET_ABI = FUN_WALLET_CONTRACT["abi"]
export const FACTORY_ABI = FACTORY_CONTRACT["abi"]
export const GASLESS_PAYMASTER_ABI = GASLESS_PAYMASTER_CONTRACT["abi"]
export const TOKEN_PAYMASTER_ABI = TOKEN_PAYMASTER_CONTRACT["abi"]
export const WITHDRAW_QUEUE_ABI = WITHDRAW_QUEUE_CONTRACT["abi"]
export const ERC_721_ABI = ERC_721_CONTRACT["abi"]
export const UNISWAP_V3_LIMIT_ORDER_ABI = UNISWAP_V3_LIMIT_ORDER_CONTRACT["abi"]
export const UNISWAPV2FACTORY_ABI = UNISWAPV2FACTORY_CONTRACT["abi"]
export const UNISWAPV2ROUTER02_ABI = UNISWAPV2ROUTER02_CONTRACT["abi"]
export const ROLE_BASED_ACCESS_CONTROL_ABI = ROLE_BASED_ACCESS_CONTROL_CONTRACT["abi"]
export const USER_AUTHENTICATION_ABI = USER_AUTHENTICATION_CONTRACT["abi"]
export const ESTIMATION_PAYMASTER_ABI = ESTIMATION_PAYMASTER_CONTRACT["abi"]

// contract interface
export const ENTRYPOINT_CONTRACT_INTERFACE = new ContractInterface(ENTRYPOINT_ABI)
export const ERC721_CONTRACT_INTERFACE = new ContractInterface(ERC_721_ABI)
export const ERC20_CONTRACT_INTERFACE = new ContractInterface(ERC20_ABI)
export const FACTORY_CONTRACT_INTERFACE = new ContractInterface(FACTORY_ABI)
export const GASLESS_PAYMASTER_CONTRACT_INTERFACE = new ContractInterface(GASLESS_PAYMASTER_ABI)
export const TOKEN_PAYMASTER_CONTRACT_INTERFACE = new ContractInterface(TOKEN_PAYMASTER_ABI)
export const WALLET_CONTRACT_INTERFACE = new ContractInterface(WALLET_ABI)
export const POOL_CONTRACT_INTERFACE = new ContractInterface(IUniswapV3PoolABI["abi"])
export const APPROVE_AND_EXEC_CONTRACT_INTERFACE = new ContractInterface(APPROVE_AND_EXEC_ABI)
export const UNISWAPV2FACTORY_INTERFACE = new ContractInterface(UNISWAPV2FACTORY_ABI)
export const UNISWAPV2ROUTER02_INTERFACE = new ContractInterface(UNISWAPV2ROUTER02_ABI)
export const RBAC_CONTRACT_INTERFACE = new ContractInterface(ROLE_BASED_ACCESS_CONTROL_ABI)
export const USER_AUTHENTICATION_CONTRACT_INTERFACE = new ContractInterface(USER_AUTHENTICATION_ABI)
export const UNISWAP_V3_LIMIT_ORDER_CONTRACT_INTERFACE = new ContractInterface(UNISWAP_V3_LIMIT_ORDER_ABI)

export const CONTRACT_ADDRESSES = {
    approveAndExecAddress: APPROVE_AND_EXEC_CONTRACT["addresses"],
    tokenSwapAddress: APPROVE_AND_SWAP_CONTRACT["addresses"],
    entryPointAddress: ENTRYPOINT_CONTRACT["addresses"],
    factoryAddress: FACTORY_CONTRACT["addresses"],
    gaslessPaymasterAddress: GASLESS_PAYMASTER_CONTRACT["addresses"],
    estimationPaymasterAddress: ESTIMATION_PAYMASTER_CONTRACT["addresses"],
    tokenPaymasterAddress: TOKEN_PAYMASTER_CONTRACT["addresses"],
    oracle: TOKEN_PRICE_ORACLE_CONTRACT["addresses"],
    userAuthAddress: USER_AUTHENTICATION_CONTRACT["addresses"],
    rbacAddress: ROLE_BASED_ACCESS_CONTROL_CONTRACT["addresses"],
    feeOracle: FEE_PERCENT_ORACLE_CONTRACT["addresses"],
    uniswapv3LimitOrder: UNISWAP_V3_LIMIT_ORDER_CONTRACT["addresses"],
    univ3factory: UNIV3_FACTORY["addresses"],
    univ3quoter: UNIV3_QUOTER["addresses"],
    univ3router: UNIV3_ROUTER["addresses"],
    UniswapV2Factory: UNISWAPV2FACTORY_CONTRACT["addresses"],
    UniswapV2Router02: UNISWAPV2ROUTER02_CONTRACT["addresses"],
    TestNFT: TEST_NFT_CONTRACT["addresses"],
    funGaslessSponsorAddress: { "5": FUN_GASLESS_SPONSOR_ADDRESS },
    funTokenSponsorAddress: {
        "1": FUN_TOKEN_SPONSOR_ADDRESS,
        "5": FUN_TOKEN_SPONSOR_ADDRESS,
        "10": FUN_TOKEN_SPONSOR_ADDRESS,
        "137": FUN_TOKEN_SPONSOR_ADDRESS,
        "8453": FUN_TOKEN_SPONSOR_ADDRESS,
        "42161": FUN_TOKEN_SPONSOR_ADDRESS
    }
}

export const gasSpecificChain = {
    "137": {
        gasStationUrl: "https://gasstation.polygon.technology/v2",
        backupPriorityFee: "1000", // 1000 gwei
        backupFee: "200" // 200 gwei
    }
}

export const FUN_FAUCET_URL = "https://api.fun.xyz/demo-faucet"

export const ETH_TRANSFER_SELECTOR = "0x00000000"

export const VALID_PRIVATE_KEY_LENGTH = 64
export const BYTES32_LENGTH = 66
// Use the paymasterAndData from pimlico for gas estimation
export const BASE_PIMLICO_PAYMASTER_AND_DATA_ESTIMATION =
    "0xa880eae8900eb59bf7dad9bdb741a086238adca900000000000000000000000000000000000000000000000000000101010101010000000000000000000000000000000000000000000000000000000000000000cd91f19f0f19ce862d7bec7b7d9b95457145afc6f639c28fd0360f488937bfa41e6eedcd3a46054fd95fcd0e3ef6b0bc0a615c4d975eef55c8a3517257904d5b1c"
export const OPTIMISM_PIMLICO_PAYMASTER_AND_DATA_ESTIMATION =
    "0x4Df91e173A6CdC74EfeF6fC72bb5Df1E8A8d758200000000000000000000000000000000000000000000000000000101010101010000000000000000000000000000000000000000000000000000000000000000cd91f19f0f19ce862d7bec7b7d9b95457145afc6f639c28fd0360f488937bfa41e6eedcd3a46054fd95fcd0e3ef6b0bc0a615c4d975eef55c8a3517257904d5b1c"
export const ETHEREUM_PIMLICO_PAYMASTER_AND_DATA_ESTIMATION =
    "0x67F21bE69A16c314a0b7Da537309b2f3ADdDE03100000000000000000000000000000000000000000000000000000101010101010000000000000000000000000000000000000000000000000000000000000000cd91f19f0f19ce862d7bec7b7d9b95457145afc6f639c28fd0360f488937bfa41e6eedcd3a46054fd95fcd0e3ef6b0bc0a615c4d975eef55c8a3517257904d5b1c"
