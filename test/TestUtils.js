const hre = require("hardhat");
const { ethers } = hre
const ERC20 = require("../utils/abis/ERC20.json")
const paymasterdata = require("../utils/abis/TokenPaymaster.json")

const HARDHAT_FORK_CHAIN_ID = 31337
const RPC_URL = "http://127.0.0.1:8545"
const PRIV_KEY = "0x66f37ee92a08eebb5da72886f3c1280d5d1bd5eb8039f52fdb8062df7e364206"
const PKEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
const DAI_ADDR = "0x6B175474E89094C44Da98b954EedeAC495271d0F"
const API_KEY = "hnHevQR0y394nBprGrvNx4HgoZHUwMet5mXTOBhf"
const USDC_ADDR = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";

const createErc = (addr, provider) => {
    return new ethers.Contract(addr, ERC20.abi, provider)
}

const getUserBalanceErc = async (sender, addr) => {
    const contract = createErc(addr, sender.provider)
    const decimals = await contract.decimals()
    const balance = await contract.balanceOf(sender.address)
    return ethers.utils.formatUnits(balance, decimals)
}

const execContractFunc = async (eoa, data) => {
    const tx = await eoa.sendTransaction(data)
    return await tx.wait()
}

const getBalance = async (wallet) => {
    const balance = await wallet.provider.getBalance(wallet.address);
    return ethers.utils.formatUnits(balance, 18)
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

const transferAmt = async (signer, to, value) => {
    const tx = await signer.sendTransaction({ to, value: ethers.utils.parseEther(value.toString()) })
    await tx.wait()
    console.log(`${await signer.getAddress()} == ${value} => ${to}`)
}

const timeout = async (ms) => {
    return new Promise((resolve) => {
        setTimeout(resolve, ms)
    })
}

const logUserPaymasterBalance = async (paymaster, wallet, note = "") => {
    const data = await paymaster.depositInfo(wallet)
    console.log(note, "user paymaster balance: ", data.amount.toString())
}


const logPairing = (AMOUNT, outDiff, tok1, tok2) => {
    console.log(`${tok1}/${tok2} = ${outDiff / AMOUNT}`)
}
const loadPaymaster = (address, provider) => {
    return new ethers.Contract(address, paymasterdata.abi, provider)
}
module.exports = {
    transferAmt, getAddrBalanceErc, timeout, getBalance, execContractFunc, logUserPaymasterBalance, loadPaymaster,
    getUserBalanceErc, createErc, logPairing, HARDHAT_FORK_CHAIN_ID, RPC_URL, PRIV_KEY, PKEY, DAI_ADDR, API_KEY, USDC_ADDR
}
