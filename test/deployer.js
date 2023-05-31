const { ethers, Wallet } = require("ethers")
const { ContractFactory, Contract } = ethers
const fs = require("fs")
const { parseUnits } = require("ethers/lib/utils");

const oracleAbi = require("../abis/TokenPriceOracle.json")
const tokenSponsorAbi = require("../abis/TokenPaymaster.json")
const gaslessSponsorAbi = require("../abis/GaslessPaymaster.json")
const authAbi = require("../abis/UserAuthentication.json")
const feeOracleAbi = require("../abis/FeePercentOracle.json")
const factoryAbi = require("../abis/FunWalletFactory.json")
const approveAndExecAbi = require("../abis/ApproveAndExec.json")
const approveAndSwapAbi = require("../abis/ApproveAndSwap.json")
const entrypointAbi = require("../abis/EntryPoint.json")

const { TEST_PRIVATE_KEY, WALLET_PRIVATE_KEY, TEST_API_KEY, getTestApiKey } = require("./testUtils")
const { Chain, Token } = require("../data")
const { configureEnvironment } = require("../managers")
const { Eoa } = require("../auth")
const { TokenSponsor } = require("../sponsors")
const { Interface, defaultAbiCoder } = require("ethers/lib/utils")

const getOptions = async (chain = 36864) => {
    const apiKey = await getTestApiKey()
    return {
        chain,
        apiKey: 'hnHevQR0y394nBprGrvNx4HgoZHUwMet5mXTOBhf',
    }
}

const deploy = async (signer, obj, params = []) => {
    const factory = new ContractFactory(obj.abi, obj.bytecode, signer);
    const contract = await factory.deploy(...params, { gasPrice: parseUnits(".1", "gwei") });
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

const deployApproveAndSwap = async (signer) => {
    return await deploy(signer, approveAndSwapAbi)
}


const main = async (chainId, privateKey) => {
    await configureEnvironment(getOptions(chainId))

    const chain = new Chain({ chainId })
    const provider = await chain.getProvider()
    const signer = new Wallet(privateKey, provider)

    // const factory = await deployTokenSponsor(signer, "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789")
    const oracle = await deployOracle(signer)
    // const gasless = await deployGaslessSponsor(signer, "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789")
    console.log(oracle)
    // const entrypoint = await deploy(signer, entrypointAbi)
    // const swap = await deployApproveAndSwap(signer)

}

const paymasterConfig = async (chainId, privateKey = TEST_PRIVATE_KEY) => {
    await configureEnvironment(await getOptions(chainId))
    // const tokenAddress = await Token.getAddress("usdc")
    const eoa = new Eoa({ privateKey })
    const sponsor = new TokenSponsor({
        gasSponsor: {
            sponsorAddress: "0x175C5611402815Eba550Dad16abd2ac366a63329",
            token: "0x855Af47Cdf980A650aDE1ad47c78ec1DEEbe9093",
        }
    })

    const oracleGOERLI = "0x601cD9fdF44EcE68bA5FF7b9273b5231d019e301"
    const aggergatorGOERLI = "0xD4a33860578De61DBAbDc8BFdb98FD742fA7028e"
    // const tokenToAddGOERLI = "0xAA8958047307Da7Bb00F0766957edeC0435b46B5"
    const tokenToAddGOERLI = ["0x07865c6e87b9f70255377e024ace6630c1eaa37f",
        "0x3E1FF16B9A94eBdE6968206706BcD473aA3Da767",
        "0x855Af47Cdf980A650aDE1ad47c78ec1DEEbe9093",
        "0xAA8958047307Da7Bb00F0766957edeC0435b46B5"]
        // await eoa.sendTx(await sponsor.addUsableToken(oracleGOERLI, tokenToAddGOERLI[3], aggergatorGOERLI))
         console.log(await sponsor.getTokenInfo(tokenToAddGOERLI[3]))

    // await eoa.sendTx(await sponsor.addUsableToken("0x40251E36b8c3ddea0cA8F8b1b2d79d0C36e7E799", "0x53589543A64408AA03ba709EFCD1a7f03AA6880D", "0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612"))
    // for (let i of tokenToAddGOERLI) {
    //     await eoa.sendTx(await sponsor.addUsableToken(oracleGOERLI, tokenToAddGOERLI[i], aggergatorGOERLI))
    //     console.log(await sponsor.getTokenInfo(tokenToAddGOERLI[i]))
    // }

    // fun dai
    // await eoa.sendTx(await sponsor.addUsableToken(oracle, "0x855af47cdf980a650ade1ad47c78ec1deebe9093", aggergator))
    // fun usdc
    // await eoa.sendTx(await sponsor.addUsableToken(oracle, "0xaa8958047307da7bb00f0766957edec0435b46b5", aggergator))
    // fun usdt
    // await eoa.sendTx(await sponsor.addUsableToken(oracle, "0x3e1ff16b9a94ebde6968206706bcd473aa3da767", aggergator))
    // await eoa.sendTx(await sponsor.addUsableToken(oracle, tokenAddress, aggergator))

    // const funDai = "0x855af47cdf980a650ade1ad47c78ec1deebe9093"
    // const funUsdc = "0xaa8958047307da7bb00f0766957edec0435b46b5"
    // const funUsdt = "0x3e1ff16b9a94ebde6968206706bcd473aa3da767"

    // // await eoa.sendTx(await sponsor.addUsableToken(oracle, funDai, aggergator))
    // // await eoa.sendTx(await sponsor.addUsableToken(oracle, funUsdc, aggergator))
    // // await eoa.sendTx(await sponsor.addUsableToken(oracle, funUsdt, aggergator))
    // console.log(await sponsor.getTokenInfo(funDai))
    // console.log(await sponsor.getTokenInfo(funUsdc))
    // console.log(await sponsor.getTokenInfo(funUsdt))
}

const feeOracleConfig = async (chainId, pkey) => {
    const oracle = "0xe2588cbD21D677144B04606123d1435dCa32b6a2"
    const chain = new Chain({ chainId })
    const provider = await chain.getProvider()
    const wallet = new Wallet(pkey, provider)
    const contract = new Contract(oracle, feeOracleAbi.abi, wallet)
    await contract.setValues(10, 2)
    console.log((await contract.getFee(10)).toString())
}

// main(5, WALLET_PRIVATE_KEY)
paymasterConfig(5, WALLET_PRIVATE_KEY)

// main(31337, TEST_PRIVATE_KEY)
// feeOracleConfig(31337, TEST_PRIVATE_KEY) 


// main(42161, WALLET_PRIVATE_KEY)
// paymasterConfig(42161, WALLET_PRIVATE_KEY)
// feeOracleConfig(36864, TEST_PRIVATE_KEY)

// paymasterTest()
// yarn run bundler --network "http://fun-alchemy-fork-eb-2-dev.us-west-2.elasticbeanstalk.com" --entryPoint "0x687F36336FCAB8747be1D41366A416b41E7E1a96" --unsafe



// const err = "0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000001741413231206469646e2774207061792070726566756e64000000000000000000"
