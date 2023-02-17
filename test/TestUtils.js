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
const AVAX_RPC_URL = "https://avalanche-fuji.infura.io/v3/4a1a0a67f6874be6bb6947a62792dab7"
const AVAX_CHAIN_ID = "43113"
const USDC_AVAX_ADDR = "0x5425890298aed601595a70AB815c96711a31Bc65"
const AVAX_RECEIVE_PKEY = '3ef076e7d3d2e1f65ded46b02372d7c5300aec49e780b3bb4418820bf068e732'

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

const logUserPaymasterBalance = async (paymasterObj, wallet, note = "") => {
    const paymaster = paymasterObj instanceof ethers.Contract ? paymasterObj : loadPaymaster(paymasterObj.paymasterAddr, wallet.provider ? wallet.provider : wallet.eoa.provider)
    const data = await paymaster.depositInfo(wallet.address)
    console.log(note, "user paymaster token balance: ", data.tokenAmount.toString())
    console.log(note, "user paymaster sponsor balance: ", data.sponsorAmount.toString())
}


const logPairing = (AMOUNT, outDiff, tok1, tok2) => {
    console.log(`${tok1}/${tok2} = ${outDiff / AMOUNT}`)
}

const loadPaymaster = (address, provider) => {
    return new ethers.Contract(address, paymasterdata.abi, provider)
}


module.exports = {
    transferAmt, getAddrBalanceErc, timeout, getBalance, execContractFunc,loadPaymaster,
    getUserBalanceErc, createErc, logPairing, HARDHAT_FORK_CHAIN_ID, RPC_URL, PRIV_KEY, PKEY, DAI_ADDR, API_KEY, USDC_ADDR, AVAX_CHAIN_ID, AVAX_RPC_URL, USDC_AVAX_ADDR, AVAX_RECEIVE_PKEY
}
