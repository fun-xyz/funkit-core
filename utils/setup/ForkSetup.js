const ethers = require("ethers")
const ERC20 = require("../abis/ERC20.json")
const { ContractFactory } = ethers
const { FunWallet } = require("../../index")
const { FunWalletConfig } = require("../../index")
const { TokenSwap, TokenTransfer } = require("../../src/modules")


const deploy = async (signer, obj, params = []) => {
    const factory = new ContractFactory(obj.abi, obj.bytecode, signer);
    const contract = await factory.deploy(...params);
    return contract.address
}


const entryPoint = require("../abis/EntryPoint.json")
const deployEntryPoint = (signer) => {
    return deploy(signer, entryPoint)
}



const authContract = require("../abis/UserAuthentication.json")
const deployAuthContract = (signer) => {
    return deploy(signer, authContract)
}


const aaveWithdraw = require("../abis/AaveWithdraw.json")
// const aaveWithdraw = require("../../../../fun-wallet-smart-contract/artifacts/contracts/modules/actions/AaveWithdraw.sol/AaveWithdraw.json")
const deployAaveWithdraw = (signer) => {
    return deploy(signer, aaveWithdraw)
}

const priceOracle = require("../abis/TokenPriceOracle.json")
const deployPriceOracle = (signer) => {
    return deploy(signer, priceOracle)
}

const approveAndSwap = require("../abis/ApproveAndSwap.json")
const deployApproveAndSwap = (signer) => {
    return deploy(signer, approveAndSwap, [WETH_MAINNET])
}

const factory = require("../abis/FunWalletFactory.json")
const deployFactory = (signer) => {
    return deploy(signer, factory)
}

const paymaster = require("../abis/TokenPaymaster.json")
const deployPaymaster = (signer, params) => {
    return deploy(signer, paymaster, params)
}

const timeout = async (ms) => {
    return new Promise((resolve) => {
        setTimeout(resolve, ms)
    })
}

const fs = require("fs");
const { generateSha256 } = require("../tools");

const basePath = "../../../fun-wallet-smart-contract/artifacts/contracts/"

const loadAbis = () => {
    const entryPointPath = "eip-4337/EntryPoint.sol/EntryPoint.json"
    const authContractPath = "validations/UserAuthentication.sol/UserAuthentication.json"
    const approveAndSwapPath = "modules/actions/ApproveAndSwap.sol/ApproveAndSwap.json"
    const aaveWithdrawPath = "modules/actions/AaveWithdraw.sol/AaveWithdraw.json"
    const factoryPath = "FunWalletFactory.sol/FunWalletFactory.json"
    const walletPath = "FunWallet.sol/FunWallet.json"
    const tokenPaymasterpath = "paymaster/TokenPaymaster.sol/TokenPaymaster.json"
    const tokenOracle = "paymaster/TokenPriceOracle.sol/TokenPriceOracle.json"
    const abis = [entryPointPath, authContractPath, approveAndSwapPath, factoryPath, walletPath, tokenPaymasterpath, tokenOracle, aaveWithdrawPath]

    abis.forEach(moveFile)
}



const moveFile = (path) => {
    const dirs = Array.from(path.split("/"))
    const fileName = dirs.at(-1)
    const newPath = `../abis/${fileName}`
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
    catch {
        console.log("ERROR: ", fileName)
    }
}



function fromReadableAmount(amount, decimals) {
    return ethers.utils.parseUnits(amount.toString(), decimals)
}

const transferAmt = async (signer, to, value) => {
    const tx = await signer.sendTransaction({ to, value: ethers.utils.parseEther(value.toString()) })
    await tx.wait()
    console.log(`${await signer.getAddress()} == ${value} => ${to}`)
}


const createErc = (addr, provider) => {
    return new ethers.Contract(addr, ERC20.abi, provider)
}

const transferErc = async (sender, addr, to, amount) => {
    const contract = createErc(addr, sender.provider)
    const decimals = await contract.decimals()
    const amt = fromReadableAmount(amount, decimals)
    const data = await contract.populateTransaction.transfer(to, amt)
    const tx = await sender.sendTransaction(data)
    return await tx.wait()
}

const getUserBalanceErc = async (sender, addr) => {
    const contract = createErc(addr, sender.provider)
    const decimals = await contract.decimals()
    const balance = await contract.balanceOf(sender.address)
    return ethers.utils.formatUnits(balance, decimals)
}
const getAddrBalanceErc = async (provider, token, addr) => {
    const contract = createErc(token, provider)
    const decimals = await contract.decimals()
    const balance = await contract.balanceOf(addr)
    return ethers.utils.formatUnits(balance, decimals)
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

    // const tokenPriceOracleAddress = await deployPriceOracle(wallet)
    // console.log(`const tokenPriceOracleAddress = "${tokenPriceOracleAddress}"`)
    // await timeout(1000)


    // // const token = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
    // // const aggregator = "0x5f4ec3df9cbd43714fe2740f5e3616155c5b8419";

    // // const params = [entryPointAddress, tokenPriceOracleAddress, token, aggregator]

    // const paymasterAddress = await deployPaymaster(wallet, params)
    // console.log(`const paymasterAddress = "${paymasterAddress}"`)
    // await timeout(1000)

    const approveAndSwapAddress = await deployApproveAndSwap(wallet)
    console.log(`const approveAndSwapAddr = "${approveAndSwapAddress}"`)
    await timeout(1000)

    const aaveWithdrawAddress = await deployAaveWithdraw(wallet)
    console.log(`const aaveWithdrawAddress = "${aaveWithdrawAddress}"`)

    const poolFactoryAddress = "0x1F98431c8aD98523631AE4a59f267346ea31F984"
    const quoterContractAddress = "0x61fFE014bA17989E743c5F6cB21bF9697530B21e"
    const uniswapV3RouterAddress = "0xE592427A0AEce92De3Edee1F18E0157C05861564"

    const config = {
        entryPointAddress,
        verificationAddress,
        factoryAddress,
        approveAndSwapAddress,
        poolFactoryAddress,
        quoterContractAddress,
        uniswapV3RouterAddress,
        aaveWithdrawAddress
    }
    fs.writeFileSync("../../test/testConfig.json", JSON.stringify(config))
}


const contractConfigPath = "../../test/testConfig.json"

const main = async () => {

    const provider = new ethers.providers.JsonRpcProvider(rpcurl)
    const wallet = new ethers.Wallet(pkey, provider)

    // const verificationAddress = await deployAuthContract(wallet)
    // console.log(`const verificationAddr = "${verificationAddress}"`)
    // await timeout(1000)

    // const factoryAddress = await deployFactory(wallet)
    // console.log(`const factoryAddress = "${factoryAddress}"`)
    // await timeout(1000)

    const aaveWithdrawAddress = await deployAaveWithdraw(wallet)
    console.log(`const aaveWithdrawAddress = "${aaveWithdrawAddress}"`)
    const olddata = require(contractConfigPath)
    fs.writeFileSync(contractConfigPath, JSON.stringify({ ...olddata, aaveWithdrawAddress }))
}



const APIKEY = "hnHevQR0y394nBprGrvNx4HgoZHUwMet5mXTOBhf"
const chain = "31337"
const rpcurl = "http://127.0.0.1:8545"


const prefundAmt = 0.3

const routerAddr = "0xE592427A0AEce92De3Edee1F18E0157C05861564"
const privKey = "66f37ee92a08eebb5da72886f3c1280d5d1bd5eb8039f52fdb8062df7e364206"
const pkey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
// const pkey = "c5ff68eee74d447b88d5d0dd1d438b37f30a4c0b1e41e9c485c6e2ea282d1489"

const USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const DAI = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
const WETH_MAINNET = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"


const amount = 10
const USDCETHAMT = ethers.utils.parseUnits((1600 * amount).toString(), 6)

const deployForFork = async () => {
    const provider = new ethers.providers.JsonRpcProvider(rpcurl)
    const wallet = new ethers.Wallet(pkey, provider)
    await transferAmt(wallet, "0xB1d3BD3E33ec9A3A15C364C441D023a73f1729F6", 10)
    await loadNetwork(wallet)
}

const deployForAvax = async () => {
    const rpcurl = "https://avalanche-fuji.infura.io/v3/4a1a0a67f6874be6bb6947a62792dab7"
    const provider = new ethers.providers.JsonRpcProvider(rpcurl)
    const wallet = new ethers.Wallet(privKey, provider)
    await loadNetwork(wallet)
}

const walletTransferERC = async (wallet, to, amount, tokenAddr) => {
    const transfer = new TokenTransfer()
    const start = await getUserBalanceErc(wallet, tokenAddr)
    console.log("Starting Wallet ERC Amount: ", start)
    await wallet.addModule(transfer)
    const transferActionTx = await transfer.createTransfer(to, amount, {address: tokenAddr})
    await wallet.deployTx(transferActionTx)
    const end = await getUserBalanceErc(wallet, tokenAddr)
    console.log("End Wallet ERC Amount: ", end)
}

const execContractFunc = async (eoa, data) => {
    const tx = await eoa.sendTransaction(data)
    return await tx.wait()
}

const paymasterdata = require("../abis/TokenPaymaster.json")

const loadPaymaster = (address, provider) => {
    return new ethers.Contract(address, paymasterdata.abi, provider)
}

const fundUserUSDCPaymaster = async (eoa, paymasterAddr, walletaddr, amount) => {
    const usdcContract = createErc(USDC, eoa)
    const paymasterContract = loadPaymaster(paymasterAddr, eoa)
    const approvedata = await usdcContract.populateTransaction.approve(paymasterAddr, USDCETHAMT)
    const depositData = await paymasterContract.populateTransaction.addDepositFor(walletaddr, USDCETHAMT)

    await execContractFunc(eoa, approvedata)
    await execContractFunc(eoa, depositData)
    await logUserPaymasterBalance(paymasterContract, walletaddr)
}


const logUserPaymasterBalance = async (paymaster, wallet, note = "") => {
    const data = await paymaster.depositInfo(wallet)
    console.log(note, "user paymaster balance: ", data.amount.toString())
}

const getBalance = async (wallet) => {
    const balance = await wallet.provider.getBalance(wallet.address);
    return ethers.utils.formatUnits(balance, 18)
}

const getUsdcWallet = async (wallet, amount = 10) => {
    const provider = new ethers.providers.JsonRpcProvider(rpcurl)
    const funder = new ethers.Wallet(pkey, provider)
    const swapModule = new TokenSwap(routerAddr)
    await wallet.addModule(swapModule)
    await wallet.deploy()

    await transferAmt(funder, wallet.address, amount)
    const USDCETHAMT = ethers.utils.parseUnits((1600 * amount).toString(), 6)
    console.log("Wallet Eth Start Balance: ", await getBalance(wallet))

    const startWalletDAI = await getUserBalanceErc(wallet, USDC)

    const tokenIn = {type: TokenTypes.ETH, symbol :"weth", chainId: HARDHAT_FORK_CHAIN_ID}
    const tokenOut = {type: TokenTypes.ERC20, address: USDC}
    const tx = await swapModule.createSwap(tokenIn, tokenOut, amount, wallet.address, 5, 100)
    await wallet.deployTx(tx)

    const endWalletDAI = await getUserBalanceErc(wallet, USDC)

    console.log("swapped for ", (endWalletDAI - startWalletDAI), " USDC")
}


const fundPaymasterEth = async (eoa, paymasterAddr, value) => {
    const paymasterContract = loadPaymaster(paymasterAddr, eoa)

    const depositData = await paymasterContract.populateTransaction.deposit()
    const tx = { ...depositData, value: ethers.utils.parseEther(value.toString()) }
    await execContractFunc(eoa, tx)

    const postBalance = await paymasterContract.getDeposit()
    console.log("paymasterBalance: ", postBalance.toString())
}

const generateBundlerCallScript = () => {
    const entryPointAddress = require("../../test/testConfig.json").entryPointAddress
    console.log(`yarn run bundler --network "http://127.0.0.1:8545" --entryPoint "${entryPointAddress}"`)

}
const setupPaymaster = async () => {
    const paymasterAddr = require("../../test/testConfig.json").paymasterAddress
    const provider = new ethers.providers.JsonRpcProvider(rpcurl)
    const eoa = new ethers.Wallet(privKey, provider)
    // const funder = new ethers.Wallet(pkey, provider)
    const walletConfig = new FunWalletConfig(eoa, chain, APIKEY, prefundAmt, "", "caleb")
    const wallet = new FunWallet(walletConfig)
    await wallet.init()
    await getUsdcWallet(wallet, amount)
    await walletTransferERC(wallet, eoa.address, USDCETHAMT, USDC)
    await fundUserUSDCPaymaster(eoa, paymasterAddr, wallet.address, amount)
    await fundPaymasterEth(eoa, paymasterAddr, amount)
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
        default: {
            main()
        }
    }
}

