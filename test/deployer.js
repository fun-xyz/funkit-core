const { ethers, Wallet } = require("ethers")
const { ContractFactory } = ethers
const fs = require("fs")
const oracleAbi = require("../abis/TokenPriceOracle.json")
const paymasterAbi = require("../abis/TokenPaymaster.json")
const authAbi = require("../abis/UserAuthentication.json")
const factoryAbi = require("../abis/FunWalletFactory.json")
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

const deployFactory = async (signer) => {
    return await deploy(signer, factoryAbi)
}

const deployUserAuth = async (signer) => {
    return await deploy(signer, authAbi)
}

const main = async (chainId, privateKey) => {

    const chain = new Chain({ chainId })
    const provider = await chain.getProvider()

    const entryPointAddr = await chain.getAddress("entryPointAddress")
    const signer = new Wallet(privateKey, provider)

    const auth = await deployFactory(signer)
    const paymaster = await deployPaymaster(signer, entryPointAddr)

    fs.writeFileSync("contracts.json", JSON.stringify({ auth }))
}

main(5, GOERLI_PRIVATE_KEY)
