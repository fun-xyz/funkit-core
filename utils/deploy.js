const { ethers } = require("ethers")

const paymasterdata = require("../abis/TokenPaymaster.json")
const priceOracle = require("../abis/TokenPriceOracle.json")
const { GOERLI_PRIVATE_KEY } = require("./test")


const RPC_URL = "https://soft-sparkling-gas.ethereum-goerli.quiknode.pro/dd9dbc656966dd7de3e7d186e5edc4ca7a96d792/"

const deploy = async (signer, obj, params = []) => {
    const factory = new ethers.ContractFactory(obj.abi, obj.bytecode, signer);
    const contract = await factory.deploy(...params, { gasLimit: 5_000_000 });
    return contract.address
}


const deployFullPaymaster = async (wallet) => {
    const token = "0xdc31Ee1784292379Fbb2964b3B9C4124D8F89C60";
    const aggregator = "0xD4a33860578De61DBAbDc8BFdb98FD742fA7028e";
    const entryPointAddress = "0x0576a174D229E3cFA37253523E645A78A0C91B57"
    const tokenPriceOracleAddress = "0x099e5576A41Ab6504883a9e4AF650C8dF0840E69"
    const params = [entryPointAddress, tokenPriceOracleAddress, token, aggregator]
    const paymasterAddress = await deploy(wallet, paymasterdata, params)
    console.log(`const paymasterAddress = "${paymasterAddress}"`)
}


const deployPriceOracle = (signer) => {
    return deploy(signer, priceOracle)
}

const main = async () => {
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL)
    const wallet = new ethers.Wallet(GOERLI_PRIVATE_KEY, provider)
    console.log(await deployFullPaymaster(wallet))
}

main()