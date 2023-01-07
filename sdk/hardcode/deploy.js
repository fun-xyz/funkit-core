require('dotenv').config();

const ethers = require('ethers');

const { ContractFactory } = ethers

const TreasuryFactory = require("../../web3/build/contracts/TreasuryFactory.json")
const Treasury = require("../../web3/build/contracts/Treasury.json")
const AaveLiquadation = require("../../web3/build/contracts/AaveLiquadation.json")
const entrypoint = require("../../web3/build/contracts/EntryPoint.json")
const AToken = require("../../web3/build/contracts/AToken.json")
const ERCToken = {
    abi: [
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "account",
                    "type": "address"
                }
            ],
            "name": "balanceOf",
            "outputs": [
                {
                    "internalType": "uint256",
                    "name": "",
                    "type": "uint256"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
    ]
}




const timeout = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms))
}

let url = "https://avalanche-fuji.infura.io/v3/4a1a0a67f6874be6bb6947a62792dab7"
const provider = new ethers.providers.JsonRpcProvider(url)

// const url = "http://127.0.0.1:8545"

url = "http://127.0.0.1:8545"
const Web3 = require('web3')
const web3 = new Web3(url);

const abi = ethers.utils.defaultAbiCoder;

// example encode
// const params = abi.encode(
//     ["address[]"], // encode as address array
//     [[addresses.tokens.weth, addresses.tokens.wbtc]]); // array to encode

// If your contract requires constructor args, you can specify them here

const main = async () => {
    console.log("TreasuryFactory address:", await deploy(TreasuryFactory))
    await timeout(1000)
    console.log("AaveLiquadation address:", await deploy(AaveLiquadation))
    // console.log("entrypoint address:", await deploy(entrypoint))
}

const keys = ethers.Wallet.fromMnemonic(process.env.MNEMONIC)

// const keys = new ethers.Wallet(privateKey = "0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba")

const wallet = keys.connect(provider)

const deploy = async (contractobj, params = []) => {
    const contractAbi = contractobj.abi
    const contractByteCode = contractobj.bytecode

    const provider = new ethers.providers.JsonRpcProvider(url);

    // const wallet = new ethers.Wallet(privateKey = "0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356")

    // const wallet = ethers.Wallet.fromMnemonic(process.env.MNEMONIC)
    // const wallet = new ethers.Wallet(privateKey = "0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba")

    const account = wallet.connect(provider);
    // const factory = new ContractFactory(contractAbi, contractByteCode, account);

    const factory = new ContractFactory(contractAbi, contractByteCode, wallet);

    const contract = await factory.deploy(...params);
    console.log(`${contractobj.contractName}: ${contract.address}`)
    return contract
}

// main()

const test = async () => {
    const { chainId } = await provider.getNetwork()

    const userAddr = "0xB1d3BD3E33ec9A3A15C364C441D023a73f1729F6"
    const tokenAddr = "0xC50E6F9E8e6CAd53c42ddCB7A42d616d7420fd3e"
    const treasuryAddr = "0xE24DEAe0Db22217b829B50b00597d55fEDD16F0f"
    const actionAddr = "0x5875fd0b350ebD5BcAf755a702E8C9AE8a3B0CcC"
    const amount = "1000000374007307417"
    const key = "key1"

    // const treasury = await deploy(Treasury, ["0x71915CfA9db263F5e7440f11C157F66Fa70b03D6", "0x71915CfA9db263F5e7440f11C157F66Fa70b03D6"])
    // await timeout(1000)
    const action = await deploy(AaveLiquadation)
    // await timeout(1000)

    const treasury = new ethers.Contract(treasuryAddr, Treasury.abi, wallet)
    // const action = new ethers.Contract(actionAddr, AaveLiquadation.abi, wallet)
    const token = new ethers.Contract(tokenAddr, AToken.abi, wallet)

    const [tokenContract, treasuryContract, actionContract] = wrapMultipleContracts(wallet, provider, chainId, [token, treasury, action])
    const underlyingassetAddr = tokenContract.callMethod("UNDERLYING_ASSET_ADDRESS")
    const underlyingasset = new ethers.Contract(underlyingassetAddr, ERCToken.abi, wallet)
    const UnderlyingAssetContract = new WrappedEthersContract(wallet, provider, chainId, underlyingasset)

    const preUserBalance = await tokenContract.callMethod("balanceOf", [userAddr])
    const preTreasuryBalance = await tokenContract.callMethod("balanceOf", [treasuryAddr])

    const approveTokenTX = await tokenContract.sendMethodTx("approve", [treasury.address, amount])
    console.log("Tokens Approved")

    const aaveData = abi.encode(["address", "address", "string"], [userAddr, tokenAddr, key]);
    const actionInitData = await actionContract.getMethodEncoding("init", [aaveData])
    const actionInitCall = await treasuryContract.sendMethodTx('callOp', [actionInitData.to, 0, actionInitData.data])
    console.log("Action Initialized")
    // const l = await actionContract.callMethod("getData", [treasury.address, key])


    const preTreasuryAllowance = await tokenContract.callMethod("allowance", [userAddr, treasury.address])
    logBalances(preUserBalance, preTreasuryBalance, "Pre Balance")
    logBalances(0, preTreasuryAllowance, "Pre Allowance")

    const aaveexec = abi.encode(["string"], [key])
    const actionExecuteCallData = await actionContract.getMethodEncoding("execute", [aaveexec])
    const actionExecuteCall = await treasuryContract.sendMethodTx('callOp', [actionExecuteCallData.to, 0, actionExecuteCallData.data])
    console.log(actionExecuteCall)
    // const transferFromData = await tokenContract.getMethodEncoding("transfer", [userAddr, preTreasuryBalance])
    // const actionExecuteCall = await treasuryContract.sendMethodTx('callOp', [transferFromData.to, 0, transferFromData.data])

    // console.log(actionExecuteCall)
    const postTreasuryAllowance = await tokenContract.callMethod("allowance", [userAddr, treasury.address])
    const postTreasuryBalance = await tokenContract.callMethod("balanceOf", [treasuryAddr])
    const postUserBalance = await tokenContract.callMethod("balanceOf", [userAddr])

    logBalances(postUserBalance, postTreasuryBalance, "Post Balance")
    logBalances(0, postTreasuryAllowance, "Post Allowance")

    const underlyingassetBalance = await UnderlyingAssetContract.callMethod("balanceOf", [userAddr])
    console.log("Underlying Asset User Balance: ", underlyingassetBalance.toString())
}


const logBalances = (u, t, title) => {
    console.log(`${title} - Treasury: ${t.toString()} User: ${u.toString()}`)
}

const ethersTransaction = async (wallet, provider, chainId, contract, method, params, nonceAdd = 0) => {
    const estimatedGasLimit = await contract.estimateGas[method](...params)
    const approveTxUnsigned = await contract.populateTransaction[method](...params)
    approveTxUnsigned.gasLimit = estimatedGasLimit;
    approveTxUnsigned.gasPrice = await provider.getGasPrice();
    approveTxUnsigned.nonce = (await provider.getTransactionCount(wallet.address)) + nonceAdd;
    approveTxUnsigned.chainId = chainId;
    const approveTxSigned = await wallet.signTransaction(approveTxUnsigned);
    const submittedTx = await provider.sendTransaction(approveTxSigned);
    await submittedTx.wait()
    return submittedTx
}

class WrappedEthersContract {
    constructor(wallet, provider, chainId, contract) {
        this.wallet = wallet
        this.provider = provider
        this.chainId = chainId
        this.contract = contract
    }

    async sendMethodTx(method, params = [], nonceAdd = 0) {
        return await ethersTransaction(wallet, this.provider, this.chainId, this.contract, method, params, nonceAdd)
    }

    async getMethodEncoding(method, params = []) {
        return await this.contract.populateTransaction[method](...params)
    }

    async callMethod(method, params = [], postResultfunc = "") {
        const res = await this.contract[method](...params)
        if (postResultfunc) {
            return res[postResultfunc]()
        }
        return res
    }
}

const wrapMultipleContracts = (wallet, provider, chainId, contracts) => {
    return contracts.map((contract => {
        return new WrappedEthersContract(wallet, provider, chainId, contract)
    }))
}



test()