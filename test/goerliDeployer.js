const { ethers, Wallet } = require("ethers")
const { ContractFactory } = ethers
const fs = require("fs")
const oracleAbi = require("../abis/TokenPriceOracle.json")
const paymasterAbi = require("../abis/TokenPaymaster.json")
const authAbi = require("../abis/UserAuthentication.json")
const { TEST_PRIVATE_KEY, GOERLI_PRIVATE_KEY } = require("./testUtils")
const { Chain } = require("../data")

const deploy = async (signer, obj, params = []) => {
    const factory = new ContractFactory(obj.abi, obj.bytecode, signer);
    const contract = await factory.deploy(...params);
    return contract.address
}

const deployOracle = async (signer) => {
    return await deploy(signer, oracleAbi)
}

const deployPaymaster = async (signer, entryPointAddr) => {
    return await deploy(signer, paymasterAbi, [entryPointAddr])
}


const deployUserAuth = async (signer) => {
    return await deploy(signer, authAbi)
}

const main = async () => {

    const chain = new Chain({ chainId: 5 })
    const provider = await chain.getProvider()

    // const entryPointAddr = await chain.getAddress("entryPointAddress")
    const signer = new Wallet(GOERLI_PRIVATE_KEY, provider)

    const auth = await deployUserAuth(signer)
    // const paymaster = await deployPaymaster(signer, entryPointAddr)

    fs.writeFileSync("contracts.json", JSON.stringify({ auth }))
}

main()
