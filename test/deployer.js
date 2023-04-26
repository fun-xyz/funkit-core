const { ethers, Wallet } = require("ethers")
const { ContractFactory } = ethers
const fs = require("fs")

const oracleAbi = require("../abis/TokenPriceOracle.json")
const tokenSponsorAbi = require("../abis/TokenPaymaster.json")
const gaslessSponsorAbi = require("../abis/GaslessPaymaster.json")
const authAbi = require("../abis/UserAuthentication.json")
const factoryAbi = require("../abis/FunWalletFactory.json")
const approveAndExecAbi = require("../abis/ApproveAndExec.json")

const { TEST_PRIVATE_KEY, GOERLI_PRIVATE_KEY, WALLET_PRIVATE_KEY, TEST_API_KEY, getTestApiKey } = require("./testUtils")
const { Chain, Token } = require("../data")
const { configureEnvironment } = require("../managers")
const { Eoa } = require("../auth")
const { TokenSponsor } = require("../sponsors")

const getOptions = async () => {
    const apiKey = await getTestApiKey()
    return {
        chain: 137,
        apiKey: apiKey,
    }
}

const deploy = async (signer, obj, params = []) => {
    const factory = new ContractFactory(obj.abi, obj.bytecode, signer);
    const contract = await factory.deploy(...params, { gasPrice: 850_000_000_000 });
    return contract.address
}

const deployOracle = async (signer) => {
    return await deploy(signer, oracleAbi)
}

const deployTokenSponsor = async (signer, entryPointAddr) => {
    return await deploy(signer, tokenSponsorAbi, [entryPointAddr])
}

const deployGaslessSponsor = async (signer, entryPointAddr) => {
    return await deploy(signer, gaslessSponsorAbi, [entryPointAddr],)
}
const deployFactory = async (signer) => {
    return await deploy(signer, factoryAbi)
}

const deployUserAuth = async (signer) => {
    return await deploy(signer, authAbi)
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

    // const gaslessSponsor = await deployGaslessSponsor(signer, entryPointAddr)
    // console.log(gaslessSponsor)
    const tokenSponsor = await deployTokenSponsor(signer, entryPointAddr)
    console.log(tokenSponsor)
    // const oracle = await deployOracle(signer)
    // console.log(oracle)
    // const auth = await deployUserAuth(signer)
    // console.log(auth)
    // const apex = await deployApproveAndExec(signer)
    // console.log(apex)


    const old = require("../contracts.json")

    fs.writeFileSync("contracts.json", JSON.stringify({
        ...old,
        // gaslessSponsor,
        tokenSponsor, oracle
    }))
}

const paymasterConfig = async () => {
    await configureEnvironment(await getOptions())

    // const tokenAddress = await Token.getAddress("usdc")
    const tokenAddress = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174"
    console.log(tokenAddress)
    const eoa = new Eoa({ privateKey: "0x6270ba97d41630c84de28dd8707b0d1c3a9cd465f7a2dba7d21b69e7a1981064" })
    const sponsor = new TokenSponsor({
        gasSponsor: {
            sponsorAddress: "0x175C5611402815Eba550Dad16abd2ac366a63329",
            token: "usdc",
        }
    })
    const oracle = require("../contracts.json").oracle
    const addtoken = await sponsor.addUsableToken(oracle, tokenAddress, "0xAB594600376Ec9fD91F8e885dADF0CE036862dE0")
    await eoa.sendTx(addtoken)

}


// main(31337, TEST_PRIVATE_KEY)
// main(5, WALLET_PRIVATE_KEY)
// main(36864, TEST_PRIVATE_KEY)
// main(137, '0x6270ba97d41630c84de28dd8707b0d1c3a9cd465f7a2dba7d21b69e7a1981064')
paymasterConfig()

