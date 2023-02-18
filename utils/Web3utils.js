const { ethers } = require("ethers")

const execContractFunc = async (eoa, data) => {
    const tx = await eoa.sendTransaction(data)
    return await tx.wait()
}

const createErc = (addr, provider) => {
    return new ethers.Contract(addr, ERC20.abi, provider)
}


module.exports = { execContractFunc, createErc }