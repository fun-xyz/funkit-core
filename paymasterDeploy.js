const paymasterAbi = require("./utils/abis/TokenPaymaster.json")
const oracleAbi = require("./utils/abis/TokenPriceOracle.json")
const { ethers } = require("hardhat");
const { PaymasterSponsor } = require("./src/paymasters");
const { ContractFactory } = ethers


const token = "0xdc31Ee1784292379Fbb2964b3B9C4124D8F89C60";
const aggregator = "0xD4a33860578De61DBAbDc8BFdb98FD742fA7028e";
const entryPointAddress = "0x0576a174D229E3cFA37253523E645A78A0C91B57"
const tokenPriceOracleAddress = "0x427420Bd1058faFa6506751E117161F95b71198F"
const paymasterAddress = "0x79F8AB73FB2682A23e987E1fB6A60E7F89b0b9F9"
const params = [entryPointAddress, tokenPriceOracleAddress, token, aggregator]

const deployPaymaster = async (signer) => {
    return await deploy(signer, paymasterAbi, params)
}


const deployOracle = async (signer) => {
    return await deploy(signer, oracleAbi)
}

const deploy = async (signer, obj, params = []) => {
    const factory = new ContractFactory(obj.abi, obj.bytecode, signer);
    const contract = await factory.deploy(...params);
    return contract.address
}


const main = async () => {
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL)
    const signer = new ethers.Wallet(PKEY, provider)
    const startWalletPaymasterUSDC = (await paymasterSponsor.depositInfo("0x177716aBA5dC062e51d3d08FE2b00588c6a5e4a3")).tokenAmount
    const startFunderPaymasterUSDC = (await paymasterSponsor.depositInfo(signer.address)).tokenAmount
    const startFunderPaymasterETH = (await paymasterSponsor.depositInfo(signer.address)).sponsorAmount

    console.log(startWalletPaymasterUSDC, startFunderPaymasterUSDC, startFunderPaymasterETH)
}


const RPC_URL = "https://eth-goerli.g.alchemy.com/v2/IQikXy8inR5TdBbRM69lpp6G_zia4Kn-"
const PKEY = "01f3645a0c1b322e37fd6402253dd02c0b92e45b4dd072a9b6e76e4eb657345b"
const walletAddress = "0x177716aBA5dC062e51d3d08FE2b00588c6a5e4a3"


// TOKEN: 0xdc31Ee1784292379Fbb2964b3B9C4124D8F89C60
const paymasterSetup = async (signer) => {
    const paymasterSponsor = new PaymasterSponsor(signer)
    await paymasterSponsor.init()
    await paymasterSponsor.stakeEth(signer.address, ".1")
    await paymasterSponsor.addTokenDepositTo(walletAddress, "10")
    await paymasterSponsor.lockTokenDeposit()
    await paymasterSponsor.setWhitelistMode()
    await paymasterSponsor.deploy()
}

main()