require('dotenv').config();

const ethers = require('ethers');

const { ContractFactory } = ethers

const TreasuryFactory = require("../../../web3/build/contracts/TreasuryFactory.json")
const Treasury = require("../../../web3/build/contracts/Treasury.json")
const AaveLiquadation = require("../../../web3/build/contracts/AaveLiquadation.json")
const entrypoint = require("../../../web3/build/contracts/EntryPoint.json")
const Token = require("../../../web3/build/contracts/AToken.json")

// const walletaddr = "0x0F658A63205Aa9640BC628cc30eF9A57F1DB3F24"


const timeout = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms))
}
const url = "https://avalanche-fuji.infura.io/v3/4a1a0a67f6874be6bb6947a62792dab7"

// const url = "http://127.0.0.1:8545"

const Web3 = require('web3')
const web3 = new Web3(url);


const UNSTAKE_DELAY_SEC = 100
const PAYMASTER_STAKE = ethers.utils.parseEther('1')

// If your contract requires constructor args, you can specify them here
const main = async () => {
    console.log("TreasuryFactory address:", await deploy(TreasuryFactory))
    await timeout(1000)
    console.log("AaveLiquadation address:", await deploy(AaveLiquadation))
    // console.log("entrypoint address:", await deploy(entrypoint))

}

const deploy = async (contractobj, params = []) => {
    const contractAbi = contractobj.abi
    const contractByteCode = contractobj.bytecode
    const provider = new ethers.providers.JsonRpcProvider(url);
    const wallet = ethers.Wallet.fromMnemonic(process.env.MNEMONIC)
    // const wallet = new ethers.Wallet(privateKey = "0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba")
    const account = wallet.connect(provider);
    const factory = new ContractFactory(contractAbi, contractByteCode, account);
    const contract = await factory.deploy(...params);
    return new web3.eth.Contract(contractAbi, contract.address)


    // return new web3.eth.Contract(contractAbi, addr)
    // return contract.address
}

// main()

const test = async () => {
    const userAddr = "0xB1d3BD3E33ec9A3A15C364C441D023a73f1729F6"
    const tokenAddr = "0xC50E6F9E8e6CAd53c42ddCB7A42d616d7420fd3e"
    const amount = "1000000"
    const tokenContract = new web3.eth.Contract(Token.abi, tokenAddr)

    // const treasury = await deploy(Treasury, ["0x71915CfA9db263F5e7440f11C157F66Fa70b03D6", "0x71915CfA9db263F5e7440f11C157F66Fa70b03D6"])
    const treasury = new web3.eth.Contract(Treasury.abi, "0xbC5211871165f1c2A6102cA9d8e95CF5220D1694")

    console.log("load treasury at: ", treasury._address)
    // const action = await deploy(AaveLiquadation)
    const action = new web3.eth.Contract(AaveLiquadation.abi, "0xb6d55fa1467da82935E0508065Fdf6eF381F21eC")
    console.log("load aave at: ", action._address)
    await timeout(5000)

    const acc = web3.eth.accounts.privateKeyToAccount("bce711e866cd91c85ba2f9b9c83b8e7a872434ff2af2ac8ce9b4301cd42b921a")
    const accs = [acc]
    web3.eth.defaultAccount = acc.address

    const preBalance = await tokenContract.methods.balanceOf(userAddr).call()

    const aavedata = web3.eth.abi.encodeParameters(["address", "address", "uint256", "string"], [userAddr, tokenAddr, amount, "key"]);
    let nonce = await web3.eth.getTransactionCount(
        acc.address
    ) + 1;

    const auth = await acc.signTransaction({
        to: tokenAddr,
        from: acc.address,
        gas: 8000000,
        data: tokenContract.methods.approve(treasury._address, amount).encodeABI(),
        nonce,
        gasPrice: 104000000000

    })
    console.log(auth)
    const tx3 = await web3.eth.sendSignedTransaction(auth.rawTransaction);
    console.log(tx3)

    // await timeout(1000)

    // const out = await acc.signTransaction({
    //     to: treasury._address,
    //     from: acc.address,
    //     gas: 223616,
    //     data: treasury.methods.callOp(action._address, "0", action.methods.init(aavedata).encodeABI()).encodeABI(),
    //     nonce: nonce + 1,
    //     gasPrice: 29000000000
    // })
    // await timeout(1000)


    // const tx = await web3.eth.sendSignedTransaction(out.rawTransaction);
    // console.log(tx)
    // const l = await action.methods.getData(treasury._address, "key").call()

    // console.log(l)

    // const aaveexex = web3.eth.abi.encodeParameters(["string"], ["key"])
    // await timeout(1000)
    // const out2 = await acc.signTransaction({
    //     to: treasury._address,
    //     gas: 423616,
    //     from: accs[0].address,
    //     data: treasury.methods.callOp(action._address, "0", action.methods.execute(aaveexex).encodeABI()).encodeABI(),
    //     nonce: nonce + 2,
    //     gasPrice: 29000000000
    // })
    // const tx2 = await web3.eth.sendSignedTransaction(out2.rawTransaction);
    // console.log(tx2)
    const preBalanceAllowance = await tokenContract.methods.allowance(userAddr, treasury._address).call()

    const postBalance = await tokenContract.methods.balanceOf(userAddr).call()
    console.log(preBalance, preBalanceAllowance, postBalance)
}



const getKey = (adr, key) => {
    return web3.utils.encodePacked(
        { value: adr, type: 'address' },
        { value: key, type: 'string' }
    );
}

test()