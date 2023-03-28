const { ethers, Wallet } = require("ethers")
const { ContractFactory } = ethers
const fs = require("fs")
const oracleAbi = require("../fun-wallet-smart-contract/artifacts/contracts/paymaster/TokenPriceOracle.sol/TokenPriceOracle.json")
const paymasterAbi = require("../fun-wallet-smart-contract/artifacts/contracts/paymaster/MultiTokenPaymaster.sol/MultiTokenPaymaster.json")
const { TEST_PRIVATE_KEY } = require("./utils/test")


const ENTRY_POINT_ADDRESS = "0x21915b79E1d334499272521a3508061354D13FF0"

const deploy = async (signer, obj, params = []) => {
    const factory = new ContractFactory(obj.abi, obj.bytecode, signer);
    const contract = await factory.deploy(...params);
    return contract.address
}

const deployOracle = async (signer) => {
    return await deploy(signer, oracleAbi)
}

const deployPaymaster = async (signer, entryPointAddr = ENTRY_POINT_ADDRESS) => {
    return await deploy(signer, paymasterAbi, [entryPointAddr])
}

const main = async () => {
    const provider = new ethers.providers.JsonRpcProvider("http://localhost:8545")
    const signer = new Wallet(TEST_PRIVATE_KEY, provider)
    
    const oracle = await deployOracle(signer)
    const paymaster = await deployPaymaster(signer)
    
    const paymasterdata = { oracle, paymaster }

    fs.writeFileSync("paymaster.json", JSON.stringify(paymasterdata))
}

main()