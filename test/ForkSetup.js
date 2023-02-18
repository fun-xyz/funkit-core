const ethers = require("ethers")
const fs = require("fs");
const { generateSha256 } = require("../utils/tools");

const { ContractFactory } = ethers
const { FunWallet } = require("../index")
const { FunWalletConfig } = require("../index")
const { TokenSwap, TokenTransfer } = require("../src/modules")

const { HARDHAT_FORK_CHAIN_ID, API_KEY, RPC_URL, PRIV_KEY, PKEY, USDC_ADDR, CHAINLINK_TOKEN_AGGREGATOR_ADDRESS, logUserPaymasterBalance, timeout, transferAmt } = require("./TestUtils")

const ERC20 = require("../utils/abis/ERC20.json")
const entryPoint = require("../utils/abis/EntryPoint.json")
const authContract = require("../utils/abis/UserAuthentication.json")
const aaveWithdraw = require("../utils/abis/AaveWithdraw.json")
const approveAndSwap = require("../utils/abis/ApproveAndSwap.json")
const factory = require("../utils/abis/FunWalletFactory.json")
const paymasterdata = require("../utils/abis/TokenPaymaster.json")
const priceOracle = require("../utils/abis/TokenPriceOracle.json")

const ROUTER_ADDR = "0xE592427A0AEce92De3Edee1F18E0157C05861564"
const WETH_MAINNET = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"

const PREFUND_AMT = 0.3
const USDCETHAMT = ethers.utils.parseUnits((1600 * 10).toString(), 6)

const testConfigPath = "./testConfig.json"

// -b
const generateBundlerCallScript = () => {
    const entryPointAddress = require(testConfigPath).entryPointAddress
    console.log(`yarn run bundler --network "http://127.0.0.1:8545" --entryPoint "${entryPointAddress}"`)

}

// -l
const loadAbis = () => {
    const entryPointPath = "eip-4337/EntryPoint.sol/EntryPoint.json"
    const authContractPath = "validations/UserAuthentication.sol/UserAuthentication.json"
    const approveAndSwapPath = "modules/actions/ApproveAndSwap.sol/ApproveAndSwap.json"
    const aaveWithdrawPath = "modules/actions/AaveWithdraw.sol/AaveWithdraw.json"
    const factoryPath = "deployer/FunWalletFactory.sol/FunWalletFactory.json"
    const walletPath = "FunWallet.sol/FunWallet.json"
    const tokenPaymasterpath = "paymaster/TokenPaymaster.sol/TokenPaymaster.json"
    const tokenOracle = "paymaster/TokenPriceOracle.sol/TokenPriceOracle.json"
    const abis = [entryPointPath, authContractPath, approveAndSwapPath, factoryPath, walletPath, tokenPaymasterpath, tokenOracle, aaveWithdrawPath]

    abis.forEach(moveFile)
}

const moveFile = (path) => {
    const dirs = Array.from(path.split("/"))
    const fileName = dirs.at(-1)
    const newPath = `../utils/abis/${fileName}`
    const basePath = "../../fun-wallet-smart-contract/artifacts/contracts/"
    try {
        const data = require(basePath + path)
        const olddata = require(newPath)
        const fileHash = generateSha256(data.bytecode)
        if (olddata.fileHash == fileHash) {
            return;
        }

        fs.writeFileSync(newPath, JSON.stringify({ ...data, fileHash }))
        console.log("SUCCESS: ", fileName)
    }
    catch (e) {
        console.log("ERROR: ", fileName)
    }
}

// -d
const deployForFork = async () => {
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL)
    const wallet = new ethers.Wallet(PKEY, provider)
    await transferAmt(wallet, "0xB1d3BD3E33ec9A3A15C364C441D023a73f1729F6", 10)
    await loadNetwork(wallet)
}

const loadNetwork = async (wallet) => {
    const entryPointAddress = await deployEntryPoint(wallet)
    console.log(`const entryPointAddress = "${entryPointAddress}"`)
    await timeout(1000)

    const verificationAddress = await deployAuthContract(wallet)
    console.log(`const verificationAddr = "${verificationAddress}"`)
    await timeout(1000)

    const factoryAddress = await deployFactory(wallet)
    console.log(`const factoryAddress = "${factoryAddress}"`)
    await timeout(1000)

    const tokenSwapAddress = await deployApproveAndSwap(wallet)
    console.log(`const tokenSwapAddress = "${tokenSwapAddress}"`)
    await timeout(1000)

    const tokenPriceOracleAddress = await deployPriceOracle(wallet)
    console.log(`const tokenPriceOracleAddress = "${tokenPriceOracleAddress}"`)
    await timeout(1000)

    const eoaAaveWithdrawAddress = await deployAaveWithdraw(wallet)
    console.log(`const eoaAaveWithdrawAddress = "${eoaAaveWithdrawAddress}"`)

    const poolFactoryAddress = "0x1F98431c8aD98523631AE4a59f267346ea31F984"
    const quoterContractAddress = "0x61fFE014bA17989E743c5F6cB21bF9697530B21e"
    const uniswapV3RouterAddress = "0xE592427A0AEce92De3Edee1F18E0157C05861564"

    const config = {
        entryPointAddress,
        verificationAddress,
        factoryAddress,
        tokenSwapAddress,
        poolFactoryAddress,
        quoterContractAddress,
        uniswapV3RouterAddress,
        tokenPriceOracleAddress,
        eoaAaveWithdrawAddress
    }
    fs.writeFileSync(testConfigPath, JSON.stringify(config))
}

// -dp
const deployFullPaymaster = async () => {
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL)
    const wallet = new ethers.Wallet(PKEY, provider)

    const token = USDC_ADDR;
    const aggregator = CHAINLINK_TOKEN_AGGREGATOR_ADDRESS;
    const entryPointAddress = require(testConfigPath).entryPointAddress
    const tokenPriceOracleAddress = require(testConfigPath).tokenPriceOracleAddress
    const params = [entryPointAddress, tokenPriceOracleAddress, token, aggregator]

    const paymasterAddress = await deployPaymaster(wallet, params)
    console.log(`const paymasterAddress = "${paymasterAddress}"`)
    await timeout(1000)

    const olddata = require(testConfigPath)
    fs.writeFileSync(testConfigPath, JSON.stringify({ ...olddata, tokenPriceOracleAddress, paymasterAddress }))
}


const deploy = async (signer, obj, params = []) => {
    const factory = new ContractFactory(obj.abi, obj.bytecode, signer);
    const contract = await factory.deploy(...params);
    return contract.address
}

const deployEntryPoint = (signer) => {
    return deploy(signer, entryPoint)
}

const deployAuthContract = (signer) => {
    return deploy(signer, authContract)
}

const deployAaveWithdraw = (signer) => {
    return deploy(signer, aaveWithdraw)
}

const deployApproveAndSwap = (signer) => {
    return deploy(signer, approveAndSwap, [WETH_MAINNET])
}

const deployFactory = (signer) => {
    return deploy(signer, factory)
}

const deployPaymaster = (signer, params) => {
    return deploy(signer, paymasterdata, params)
}
const deployPriceOracle = (signer) => {
    return deploy(signer, priceOracle)
}

// -da
const deployForAvax = async () => {
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL)
    const wallet = new ethers.Wallet(PRIV_KEY, provider)
    await loadNetwork(wallet)
}

// -sp
const setupPaymaster = async () => {
    const paymasterAddr = require(testConfigPath).paymasterAddress
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL)
    const eoa = new ethers.Wallet(PRIV_KEY, provider)
    const walletConfig = new FunWalletConfig(eoa, HARDHAT_FORK_CHAIN_ID, API_KEY, PREFUND_AMT, "", "caleb")
    const wallet = new FunWallet(walletConfig)
    await wallet.init()
    await getUsdcWallet(wallet, amount)
    await walletTransferERC(wallet, eoa.address, USDCETHAMT, USDC_ADDR)
    await fundUserUSDCPaymaster(eoa, paymasterAddr, wallet.address, amount)
    await fundPaymasterEth(eoa, paymasterAddr, amount)
}

const getBalance = async (wallet) => {
    const balance = await wallet.provider.getBalance(wallet.address);
    return ethers.utils.formatUnits(balance, 18)
}

const createErc = (addr, provider) => {
    return new ethers.Contract(addr, ERC20.abi, provider)
}

const getUserBalanceErc = async (sender, addr) => {
    const contract = createErc(addr, sender.provider)
    const decimals = await contract.decimals()
    const balance = await contract.balanceOf(sender.address)
    return ethers.utils.formatUnits(balance, decimals)
}

const getUsdcWallet = async (wallet, amount = 10) => {
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL)
    const funder = new ethers.Wallet(PKEY, provider)
    const swapModule = new TokenSwap(ROUTER_ADDR)
    await wallet.addModule(swapModule)
    await wallet.deploy()

    await transferAmt(funder, wallet.address, amount)
    const USDCETHAMT = ethers.utils.parseUnits((1600 * amount).toString(), 6)
    console.log("Wallet Eth Start Balance: ", await getBalance(wallet))

    const startWalletDAI = await getUserBalanceErc(wallet, USDC_ADDR)

    const tokenIn = { type: TokenTypes.ETH, symbol: "weth", chainId: HARDHAT_FORK_CHAIN_ID }
    const tokenOut = { type: TokenTypes.ERC20, address: USDC_ADDR }
    const tx = await swapModule.createSwapTx(tokenIn, tokenOut, amount, wallet.address, 5, 100)
    await wallet.deployTx(tx)

    const endWalletDAI = await getUserBalanceErc(wallet, USDC_ADDR)

    console.log("swapped for ", (endWalletDAI - startWalletDAI), " USDC")
}

const walletTransferERC = async (wallet, to, amount, tokenAddr) => {
    const transfer = new TokenTransfer()
    const start = await getUserBalanceErc(wallet, tokenAddr)
    console.log("Starting Wallet ERC Amount: ", start)
    await wallet.addModule(transfer)
    const transferActionTx = await transfer.createTransferTx(to, amount, { address: tokenAddr })
    await wallet.deployTx(transferActionTx)
    const end = await getUserBalanceErc(wallet, tokenAddr)
    console.log("End Wallet ERC Amount: ", end)
}

const loadPaymaster = (address, provider) => {
    return new ethers.Contract(address, paymasterdata.abi, provider)
}

const execContractFunc = async (eoa, data) => {
    const tx = await eoa.sendTransaction(data)
    return await tx.wait()
}

const fundUserUSDCPaymaster = async (eoa, paymasterAddr, walletaddr, amount) => {
    const usdcContract = createErc(USDC_ADDR, eoa)
    const paymasterContract = loadPaymaster(paymasterAddr, eoa)
    const approvedata = await usdcContract.populateTransaction.approve(paymasterAddr, USDCETHAMT)
    const depositData = await paymasterContract.populateTransaction.addDepositFor(walletaddr, USDCETHAMT)

    await execContractFunc(eoa, approvedata)
    await execContractFunc(eoa, depositData)
    await logUserPaymasterBalance(paymasterContract, walletaddr)
}

const fundPaymasterEth = async (eoa, paymasterAddr, value) => {
    const paymasterContract = loadPaymaster(paymasterAddr, eoa)

    const depositData = await paymasterContract.populateTransaction.deposit()
    const tx = { ...depositData, value: ethers.utils.parseEther(value.toString()) }
    await execContractFunc(eoa, tx)

    const postBalance = await paymasterContract.getDeposit()
    console.log("paymasterBalance: ", postBalance.toString())
}

// default
const main = async () => {

    const provider = new ethers.providers.JsonRpcProvider(RPC_URL)
    const wallet = new ethers.Wallet(PKEY, provider)
    const aaveWithdrawAddress = await deployAaveWithdraw(wallet)
    console.log(`const aaveWithdrawAddress = "${aaveWithdrawAddress}"`)
    const olddata = require(testConfigPath)
    fs.writeFileSync(testConfigPath, JSON.stringify({ ...olddata, aaveWithdrawAddress }))
}

if (typeof require !== 'undefined' && require.main === module) {

    switch (process.argv[2]) {
        case "-b": {
            generateBundlerCallScript()
            return;
        }
        case "-l": {
            loadAbis();
            return;
        }
        case "-d": {
            deployForFork();
            return;
        }
        case "-da": {
            deployForAvax();
            return;
        }
        case "-sp": {
            setupPaymaster();
            return;
        }
        case "-dp": {
            deployFullPaymaster();
            return;
        }
        default: {
            main()
        }
    }
}