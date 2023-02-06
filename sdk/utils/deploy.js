const hre = require("hardhat");
const { ethers } = hre

const helpers = require("@nomicfoundation/hardhat-network-helpers");
const ERC20 = require("./abis/ERC20.json")

const { ContractFactory } = ethers

const { swapTest } = require("../src/modules/SwapUtils")


const pkey = "66f37ee92a08eebb5da72886f3c1280d5d1bd5eb8039f52fdb8062df7e364206"

const deploy = async (signer, obj, params = []) => {
    const factory = new ContractFactory(obj.abi, obj.bytecode, signer);
    const contract = await factory.deploy(...params);
    console.log(contract.address);
}


const entryPoint = require("../utils/abis/EntryPoint.json")
const deployEntryPoint = (signer) => {
    return deploy(signer, entryPoint)

}

const factory = require("./abis/FunWalletFactory.json")
const deployFactory = (signer) => {
    return deploy(signer, factory)
}

const supply = require("./abis/AaveSupply.json")
const deploySupply = (signer) => {
    return deploy(signer, supply)
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
    const tx = await signer.sendTransaction({ to, value: ethers.utils.parseEther(value) })
    await tx.wait()
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
    console.log((await contract.balanceOf(sender.address)).toString())
}
const createSigner = async (address) => {

    await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [address],
    });
    return impersonatedSigner = await ethers.getSigner(address);
}
const USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
const DAI = "0x6B175474E89094C44Da98b954EedeAC495271d0F"


const rpcUrl = "https://avalanche-fuji.infura.io/v3/4a1a0a67f6874be6bb6947a62792dab7"


const hreProvider = hre.network.provider

const main = async () => {
    // const provider = new ethers.providers.Web3Provider(hreProvider)
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl)
    // const signer = await createSigner("0x1B7BAa734C00298b9429b518D621753Bb0f6efF2")
    const wallet = new ethers.Wallet(pkey, provider)
    // await deployEntryPoint(wallet)
    // await timeout(1000)
    await deployFactory(wallet)
    // const receipt = await transferErc(signer, USDC, wallet.address, 10)
    // await getUserBalanceErc(wallet, USDC)
    // await getUserBalanceErc(wallet, DAI)


    // await swapTest(wallet)
    // await getUserBalanceErc(wallet, USDC)
    // await getUserBalanceErc(wallet, DAI)
}

main()