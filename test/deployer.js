const { ethers, Wallet } = require("ethers")
const { ContractFactory } = ethers
const fs = require("fs")

const oracleAbi = require("../abis/TokenPriceOracle.json")
const tokenSponsorAbi = require("../abis/TokenPaymaster.json")
const gaslessSponsorAbi = require("../abis/GaslessPaymaster.json")
const authAbi = require("../abis/UserAuthentication.json")
const factoryAbi = require("../abis/FunWalletFactory.json")

const { TEST_PRIVATE_KEY, GOERLI_PRIVATE_KEY, TEST_API_KEY } = require("./testUtils")
const { Chain, Token } = require("../data")
const { configureEnvironment } = require("../managers")
const { Eoa } = require("../auth")
const { TokenSponsor } = require("../sponsors")

const options = {
    chain: 36864,
    apiKey: "aci4Jw5RtX36aHiCZEfm96vmnYfqfBgi28FFCGJe",
}
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
    await configureEnvironment(options)

    const chain = new Chain({ chainId })
    const provider = await chain.getProvider()

    const entryPointAddr = await chain.getAddress("entryPointAddress")
    const signer = new Wallet(privateKey, provider)

    // const gaslessSponsor = await deployGaslessSponsor(signer, entryPointAddr)
    const tokenSponsor = await deployTokenSponsor(signer, entryPointAddr)
    const oracle = await deployOracle(signer)


    const factory = await deployFactory(signer)


    const old = require("../contracts.json")

    fs.writeFileSync("contracts.json", JSON.stringify({
        ...old,
        factory,
        // gaslessSponsor,
        // tokenSponsor,oracle 
    }))
}

const paymasterConfig = async () => {
    await configureEnvironment(options)

    const tokenAddress = await Token.getAddress("usdc")
    const eoa = new Eoa({ privateKey: TEST_PRIVATE_KEY })
    const sponsor = new TokenSponsor({
        gasSponsor: {
            sponsorAddress: "0x5f4ec3df9cbd43714fe2740f5e3616155c5b8419",
            token: "usdc",
        }
    })
    const oracle = require("../contracts.json").oracle

    const addtoken = await sponsor.addUsableToken(oracle, tokenAddress, "0x5f4ec3df9cbd43714fe2740f5e3616155c5b8419")
    await eoa.sendTx(addtoken)

}

// main(5, GOERLI_PRIVATE_KEY)
// main(36864, TEST_PRIVATE_KEY)
// paymasterConfig()

