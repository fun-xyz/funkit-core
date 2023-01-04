const ethers = require('ethers');
const { ContractFactory } = ethers

// const contractobj = require("../../web3/build/contracts/TreasuryFactory.json")
const contractobj = require("../../web3/build/contracts/AaveLiquadation.json")

const walletaddr = "0x0F658A63205Aa9640BC628cc30eF9A57F1DB3F24"
const contractAbi = contractobj.abi
const contractByteCode = contractobj.bytecode

const url = "http://localhost:8545"
const Web3 = require('web3')
const web3 = new Web3(url);

// If your contract requires constructor args, you can specify them here
const main = async () => {
    // const accs = await web3.eth.getAccounts()
    // await web3.eth.sendTransaction({ to: walletaddr, from: accs[0], value: web3.utils.toWei("100", "ether") })
    // web3.eth.getBalance(walletaddr, (err, bal) => {
    //     console.log("Account balance:", bal);
    //   });

    const provider = new ethers.providers.JsonRpcProvider("http://localhost:8545");
    const wallet = new ethers.Wallet(privateKey = "0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356")
    const account = wallet.connect(provider);

    const factory = new ContractFactory(contractAbi, contractByteCode, account);

    const contract = await factory.deploy();

    console.log(contract.address);
}

main()