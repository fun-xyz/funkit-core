const ethers = require('ethers');
const { ContractFactory } = ethers

const TreasuryFactory = require("../../web3/build/contracts/TreasuryFactory.json")
const AaveLiquadation = require("../../web3/build/contracts/AaveLiquadation.json")

const walletaddr = "0x0F658A63205Aa9640BC628cc30eF9A57F1DB3F24"


const url = "http://127.0.0.1:8545"
const Web3 = require('web3')
const web3 = new Web3(url);

// If your contract requires constructor args, you can specify them here
const main = async () => {
    console.log("TreasuryFactory address:", await deploy(TreasuryFactory))
    console.log("AaveLiquadation address:", await deploy(AaveLiquadation))

}

const deploy = async (contractobj) => {
    const contractAbi = contractobj.abi
    const contractByteCode = contractobj.bytecode
    const provider = new ethers.providers.JsonRpcProvider(url);
    const wallet = new ethers.Wallet(privateKey = "0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356")
    const account = wallet.connect(provider);
    const factory = new ContractFactory(contractAbi, contractByteCode, account);
    const contract = await factory.deploy();
    return contract.address
}

main()