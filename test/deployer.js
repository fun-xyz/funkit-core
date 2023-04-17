const { ethers, Wallet } = require("ethers")
const { ContractFactory } = ethers
const fs = require("fs")

const oracleAbi = require("../abis/TokenPriceOracle.json")
const tokenSponsorAbi = require("../abis/TokenPaymaster.json")
const gaslessSponsorAbi = require("../abis/GaslessPaymaster.json")
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

const deployTokenSponsor = async (signer, entryPointAddr) => {
    return await deploy(signer, tokenSponsorAbi, [entryPointAddr])
}

const deployGaslessSponsor = async (signer, entryPointAddr) => {
    return await deploy(signer, gaslessSponsorAbi, [entryPointAddr])
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

    // const entryPointAddr = await chain.getAddress("entryPointAddress")
    const signer = new Wallet(privateKey, provider)

    // const gaslessSponsor = await deployGaslessSponsor(signer, entryPointAddr)
    // const tokenSponsor = await deployTokenSponsor(signer, entryPointAddr)
    // const oracle = await deployOracle(signer)

    const auth = await deployUserAuth(signer)
    console.log(auth)

    const old = require("../contracts.json")

    // fs.writeFileSync("contracts.json", JSON.stringify({
    //     ...old,
    //     gaslessSponsor,
    //     // tokenSponsor,oracle 
    // }))
}

main(5, GOERLI_PRIVATE_KEY)
// main(36864, TEST_PRIVATE_KEY)
