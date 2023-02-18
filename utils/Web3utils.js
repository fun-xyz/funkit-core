const { ethers } = require("ethers")
const HARDHAT_FORK_CHAIN_ID = 31337
const ERC20 = require("../utils/abis/ERC20.json")

const execContractFunc = async (eoa, data) => {
    const tx = await eoa.sendTransaction(data)
    return await tx.wait()
}

const createErc = (addr, provider) => {
    return new ethers.Contract(addr, ERC20.abi, provider)
}


module.exports = { execContractFunc, createErc, HARDHAT_FORK_CHAIN_ID }