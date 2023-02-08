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


const entryPoint = require("../utils/abis/EntryPoint.json")
const deployEntryPoint = (signer) => {
    return deploy(signer, entryPoint)
}

const authContract = require("../utils/abis/UserAuthentication.json")
const deployAuthContract = (signer) => {
    return deploy(signer, authContract)
}


// const approveAndSwap = require("../../../fun-wallet-smart-contract/artifacts/contracts/modules/actions/ApproveAndSwap.sol/ApproveAndSwap.json")
const approveAndSwap = require("../utils/abis/ApproveAndSwap.json")
const deployApproveAndSwap = (signer) => {
    return deploy(signer, approveAndSwap, [WETH_MAINNET])
}

const factory = require("../utils/abis/FunWalletFactory.json")
const deployFactory = (signer) => {
    return deploy(signer, factory)
}


const timeout = async (ms) => {
    return new Promise((resolve) => {
        setTimeout(resolve, ms)
    })
}

const setupHardhatFork = () => {

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
const createSigner = async (address) => {
    await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [address],
    });
    return impersonatedSigner = await ethers.getSigner(address);
}

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
const rpcUrl = "http://127.0.0.1:8545"


const hreProvider = hre.network.provider
const pkey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
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


const loadNetwork = async (wallet, addrs, amt) => {
    for (let addr of addrs) {
        await transferAmt(wallet, addr, amt)
    }
    const entryPointAddress = await deployEntryPoint(wallet)
    console.log(`const entryPointAddress = "${entryPointAddress}"`)
    await timeout(1000)

    const verificationAddr = await deployAuthContract(wallet)
    console.log(`const verificationAddr = "${verificationAddr}"`)
    await timeout(1000)

    const factoryAddress = await deployFactory(wallet)
    console.log(`const factoryAddress = "${factoryAddress}"`)
    await timeout(1000)

    const approveAndSwapAddr = await deployApproveAndSwap(wallet)

    console.log(`\n\actionAddr = "${approveAndSwapAddr}"`)
}

const addrs = ["0xB1d3BD3E33ec9A3A15C364C441D023a73f1729F6", "0xA596e25E2CbC988867B4Ee7Dc73634329E674d9e"]
const baseAmt = 10

const main = async () => {
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl)
    const wallet = new ethers.Wallet(pkey, provider)
    await generalDeployment(wallet)

}

if (typeof require !== 'undefined' && require.main === module) {
    main()
}


module.exports = {
    execTest,
    transferAmt,
    transferErc,
    getUserBalanceErc,
    getAddrBalanceErc
}
