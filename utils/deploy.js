const hre = require("hardhat");
const { ethers } = hre

const helpers = require("@nomicfoundation/hardhat-network-helpers");
const ERC20 = require("./abis/ERC20.json")

const { ContractFactory } = ethers

const WETH_MAINNET = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"




const deploy = async (signer, obj, params = []) => {
    const factory = new ContractFactory(obj.abi, obj.bytecode, signer);
    const contract = await factory.deploy(...params);
    return contract.address
}

const execContractFunc = async (eoa, data) => {
    const tx = await eoa.sendTransaction(data)
    return await tx.wait()
}


const entryPoint = require("../utils/abis/EntryPoint.json")
const deployEntryPoint = (signer) => {
    return deploy(signer, entryPoint)
}



const authContract = require("../utils/abis/UserAuthentication.json")
const deployAuthContract = (signer) => {
    return deploy(signer, authContract)
}

const aaveWithdraw = require("../utils/abis/AaveWithdraw.json")
const deployAaveWithdraw = (signer) => {
    return deploy(signer, aaveWithdraw)
}

const priceOracle = require("../utils/abis/TokenPriceOracle.json")
const deployPriceOracle = (signer) => {
    return deploy(signer, priceOracle)
}

// const approveAndSwap = require("modules/actions/ApproveAndSwap.sol/ApproveAndSwap.json")
const approveAndSwap = require("../utils/abis/ApproveAndSwap.json")
const deployApproveAndSwap = (signer) => {
    return deploy(signer, approveAndSwap, [WETH_MAINNET])
}

const factory = require("../utils/abis/FunWalletFactory.json")
const deployFactory = (signer) => {
    return deploy(signer, factory)
}

const paymaster = require("../utils/abis/TokenPaymaster.json")
const deployPaymaster = (signer, params) => {
    return deploy(signer, paymaster, params)
}
const deployPaymasterWithParams = async (wallet) => {
    const entryPoint = "0xD1760AA0FCD9e64bA4ea43399Ad789CFd63C7809";
    const tokenPriceOracle = "0xD94A92749C0bb33c4e4bA7980c6dAD0e3eFfb720";

}

const timeout = async (ms) => {
    return new Promise((resolve) => {
        setTimeout(resolve, ms)
    })
}

const fs = require("fs");
const { generateSha256 } = require("./tools");

const basePath = "../../../fun-wallet-smart-contract/artifacts/contracts/"

const loadAbis = () => {

    const entryPointPath = "eip-4337/EntryPoint.sol/EntryPoint.json"
    const authContractPath = "validations/UserAuthentication.sol/UserAuthentication.json"
    const approveAndSwapPath = "modules/actions/ApproveAndSwap.sol/ApproveAndSwap.json"
    const factoryPath = "FunWalletFactory.sol/FunWalletFactory.json"
    const walletPath = "FunWallet.sol/FunWallet.json"
    const tokenPaymasterpath = "paymaster/TokenPaymaster.sol/TokenPaymaster.json"
    const abis = [entryPointPath, authContractPath, approveAndSwapPath, factoryPath, walletPath, tokenPaymasterpath]

    abis.forEach(moveFile)
}



const moveFile = (path) => {
    const dirs = Array.from(path.split("/"))
    const fileName = dirs.at(-1)
    const newPath = `../utils/abis/${fileName}`
    const data = require(basePath + path)
    const olddata = require(newPath)
    const fileHash = generateSha256(data.bytecode)
    if (olddata.fileHash == fileHash) {
        return;
    }

    fs.writeFileSync(newPath, JSON.stringify({ ...data, fileHash }))
    console.log(fileName)
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
const getAddrBalanceErc = async (provider, token, addr, format = true) => {
    const contract = createErc(token, provider)
    const decimals = await contract.decimals()
    const balance = await contract.balanceOf(addr)
    if (format) {
        return ethers.utils.formatUnits(balance, decimals)
    }
    return balance
}

const getAllowanceErc = async (provider, token, owner, spender, format = true) => {
    const contract = createErc(token, provider)
    const decimals = await contract.decimals()
    const balance = await contract.allowance(owner, spender)
    if (format) {
        return ethers.utils.formatUnits(balance, decimals)
    }
    return balance
}
const createSigner = async (address) => {
    await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [address],
    });
    return impersonatedSigner = await ethers.getSigner(address);
}

const hreProvider = hre.network.provider
const execTest = async (addrs, func) => {
    const provider = new ethers.providers.Web3Provider(hreProvider)
    const signers = await Promise.all(addrs.map((addr) => {
        return createSigner(addr)
    }))
    await func(provider, signers)
}

const USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
const DAI = "0x6B175474E89094C44Da98b954EedeAC495271d0F"




// const rpcUrl = "https://avalanche-fuji.infura.io/v3/4a1a0a67f6874be6bb6947a62792dab7"
// const rpcUrl = "https://api.avax-test.network/ext/bc/C/rpc"
// const rpcUrl = "https://rpc.buildbear.io/Favourite_Yoda_da3bc0bd"



// const pkey = "66f37ee92a08eebb5da72886f3c1280d5d1bd5eb8039f52fdb8062df7e364206"
// const provider = new ethers.providers.Web3Provider(hreProvider)
// const signer = await createSigner("0x1B7BAa734C00298b9429b518D621753Bb0f6efF2")
// await deployEntryPoint(wallet)
// await timeout(1000)
// await deployFactory(wallet)
// const receipt = await transferErc(signer, USDC, wallet.address, 10)
// await getUserBalanceErc(wallet, USDC)
// await getUserBalanceErc(wallet, DAI)
// await swapTest(wallet)
// await getUserBalanceErc(wallet, USDC)
// await getUserBalanceErc(wallet, DAI)


const deployCore = async (wallet) => {
    const entryPointAddress = await deployEntryPoint(wallet)
    console.log(`const entryPointAddress = "${entryPointAddress}"`)
    await timeout(1000)

    const verificationAddr = await deployAuthContract(wallet)
    console.log(`const verificationAddr = "${verificationAddr}"`)
    await timeout(1000)
}

const generalDeployment = async (wallet) => {
    const approveAndSwapAddr = await deployApproveAndSwap(wallet)
    console.log(`\n\actionAddr = "${approveAndSwapAddr}"`)
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

    const tokenPriceOracleAddress = await deployPriceOracle(wallet)
    console.log(`const tokenPriceOracleAddress = "${tokenPriceOracleAddress}"`)
    await timeout(1000)


    const token = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
    const aggregator = "0x5f4ec3df9cbd43714fe2740f5e3616155c5b8419";

    const params = [entryPointAddress, tokenPriceOracleAddress, token, aggregator]

    const approveAndSwapAddress = await deployApproveAndSwap(wallet)
    console.log(`const approveAndSwapAddr = "${approveAndSwapAddress}"`)
    await timeout(1000)

    const aaveWithdrawAddress = await deployAaveWithdraw(wallet)
    console.log(`const aaveWithdrawAddress = "${aaveWithdrawAddress}"`)
    await timeout(1000)

    const paymasterAddress = await deployPaymaster(wallet, params)
    console.log(`const paymasterAddress = "${paymasterAddress}"`)

    const config = {
        entryPointAddress,
        verificationAddress,
        factoryAddress,
        tokenPriceOracleAddress,
        paymasterAddress,
        approveAndSwapAddress,
        aaveWithdrawAddress
    }

    fs.writeFileSync("../test/contractConfig.json", JSON.stringify(config))
}


const rpcUrl = "http://127.0.0.1:8545"
const pkey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"

// const rpcUrl = "https://avalanche-fuji.infura.io/v3/4a1a0a67f6874be6bb6947a62792dab7"
// const pkey = "ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
// await loadNetwork(wallet, addrs, baseAmt)

const main = async () => {
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl)
    const wallet = new ethers.Wallet(pkey, provider)

    const approveAndSwapAddr = await deployApproveAndSwap(wallet)
    console.log(`\nactionAddr = "${approveAndSwapAddr}"`)
    await timeout(1000)
    await deployPaymasterWithParams(wallet)
    // await transferAmt(wallet, "0xA596e25E2CbC988867B4Ee7Dc73634329E674d9e", 10)
}

const deployForFork = async () => {
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl)
    const wallet = new ethers.Wallet(pkey, provider)
    await loadNetwork(wallet)
}

const getBalance = async (wallet) => {
    const balance = await wallet.provider.getBalance(wallet.address);
    return ethers.utils.formatUnits(balance, 18)
}


if (typeof require !== 'undefined' && require.main === module) {

    switch (process.argv[2]) {
        case "-l": {
            loadAbis();
            return;
        }
        case "-d": {
            deployForFork();
            return;
        }
        default: {
            main()
        }
    }
}


module.exports = {
    execTest,
    transferAmt,
    transferErc,
    getUserBalanceErc,
    getAddrBalanceErc,
    createErc,
    getBalance,
    execContractFunc,
    getAllowanceErc,
    timeout
}
