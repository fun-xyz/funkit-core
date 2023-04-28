const { ethers, Wallet } = require("ethers")
const { ContractFactory, Contract } = ethers
const fs = require("fs")

const oracleAbi = require("../abis/TokenPriceOracle.json")
const tokenSponsorAbi = require("../abis/TokenPaymaster.json")
const gaslessSponsorAbi = require("../abis/GaslessPaymaster.json")
const authAbi = require("../abis/UserAuthentication.json")
const feeOracleAbi = require("../abis/FeePercentOracle.json")
const factoryAbi = require("../abis/FunWalletFactory.json")
const approveAndExecAbi = require("../abis/ApproveAndExec.json")
const entrypointAbi = require("../abis/EntryPoint.json")

const { TEST_PRIVATE_KEY, GOERLI_PRIVATE_KEY, TEST_API_KEY, getTestApiKey } = require("./testUtils")
const { Chain, Token } = require("../data")
const { configureEnvironment } = require("../managers")
const { Eoa } = require("../auth")
const { TokenSponsor } = require("../sponsors")

const getOptions = async (chain = 36864) => {
    const apiKey = await getTestApiKey()
    return {
        chain,
        apiKey: apiKey,
    }
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

const deployFeeOracle = async (signer) => {
    return await deploy(signer, feeOracleAbi)
}
const deployApproveAndExec = async (signer) => {
    return await deploy(signer, approveAndExecAbi)
}


const main = async (chainId, privateKey) => {
    await configureEnvironment(getOptions)

    const chain = new Chain({ chainId })
    const provider = await chain.getProvider()

    const entryPointAddr = await chain.getAddress("entryPointAddress")
    const signer = new Wallet(privateKey, provider)

    // const newEntry = await deploy(signer, entrypointAbi)
    // console.log(newEntry)

    const factory = await deployTokenSponsor(signer, entryPointAddr)
    const oracle = await deployOracle(signer, entryPointAddr)
    
    console.log(factory)
    console.log(oracle)
    // fs.writeFileSync("contracts.json", JSON.stringify({
    //     ...old,
    //     feeoracle,
    //     // factory,
    //     // gaslessSponsor,
    //     // tokenSponsor,oracle 
    // }))
}

const paymasterConfig = async (chainId, privateKey = TEST_PRIVATE_KEY) => {
    await configureEnvironment(await getOptions(chainId))

    const tokenAddress = await Token.getAddress("usdc")
    const eoa = new Eoa({ privateKey })
    const sponsor = new TokenSponsor({
        gasSponsor: {
            sponsorAddress: "0x5f4ec3df9cbd43714fe2740f5e3616155c5b8419",
            token: "usdc",
        }
    })

    const addtoken = await sponsor.addUsableToken("0xCb7C8BF1a08b1B631051f80c2f7C4566F3ad785D", tokenAddress, "0x5f4ec3df9cbd43714fe2740f5e3616155c5b8419")
    await eoa.sendTx(addtoken)
}

const feeOracleConfig = async (chainId, pkey) => {
    const oracle = require("../contracts.json").feeoracle
    const chain = new Chain({ chainId })
    const provider = await chain.getProvider()
    const wallet = new Wallet(pkey, provider)
    const contract = new Contract(oracle, feeOracleAbi.abi, wallet)
    await contract.setValues(10, 2)
    console.log((await contract.getFee(10)).toString())
}
// main(5, GOERLI_PRIVATE_KEY)

// main(31337, TEST_PRIVATE_KEY)
// feeOracleConfig(31337, TEST_PRIVATE_KEY) 


// paymasterConfig(36864, TEST_PRIVATE_KEY)
// main(36864, TEST_PRIVATE_KEY)
// feeOracleConfig(36864, TEST_PRIVATE_KEY)