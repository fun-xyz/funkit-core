const hre = require("hardhat");
const { ethers } = hre

const ERC20 = require("./abis/ERC20.json")

const { ContractFactory } = ethers


const rpcUrl = "http://127.0.0.1:8545/"
const pkey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"

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

const main = async () => {
    const provider = new ethers.providers.JsonRpcProvider("http://127.0.0.1:8545/")
    const wallet = new ethers.Wallet(pkey, provider)

    // await transferAmt(wallet, "0xA596e25E2CbC988867B4Ee7Dc73634329E674d9e", "10")

    // await deploySupply(wallet)
    // await deployEntryPoint(wallet)
    // await timeout(1000)
    // await deployFactory(wallet)
}

main()