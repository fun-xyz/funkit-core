require('dotenv').config();

const ethers = require('ethers')
const { createHash } = require("crypto")
const { HttpRpcClient } = require('@account-abstraction/sdk')
const { wrapProvider } = require("./Provider")
const { TreasuryAPI } = require("./treasuryapi")
const Tx = require('@ethereumjs/tx').Transaction;


const timeout = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms))
}

const treasuryAbi = require("../../web3/build/contracts/Treasury.json").abi
const treasuryfactbytecode = require("../../web3/build/contracts/TreasuryFactory.json").bytecode
const aaveActionContract = require("../../web3/build/contracts/AaveLiquadation.json").abi
const entrypointcontract = require("../../web3/build/contracts/EntryPoint.json").abi
const ATokenContract = require("../../web3/build/contracts/AToken.json").abi

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


const abi = ethers.utils.defaultAbiCoder;




const url = "https://avalanche-fuji.infura.io/v3/4a1a0a67f6874be6bb6947a62792dab7"
const bundlerUrl = "http://localhost:3000/rpc"

const entryPointAddress = "0xCf64E11cd6A6499FD6d729986056F5cA7348349D"
const factoryAddress = "0xd627e195E4E0Aa7A3e2d8Ed8Cd39B574bdfe1322"

const tokenAddr = "0xC42f40B7E22bcca66B3EE22F3ACb86d24C997CC2"
const actionAddr = "0x7BA312a59758F210F200E4fe80539e96BFfabAc7"

const provider = new ethers.providers.JsonRpcProvider(url);
const ownerAccount = new ethers.Wallet("0x66f37ee92a08eebb5da72886f3c1280d5d1bd5eb8039f52fdb8062df7e364206", provider)

// const userWallet = ethers.Wallet.fromMnemonic(process.env.MNEMONIC)
// const ownerAccount = userWallet.connect(provider)

class FunWallet {
    MAX_INT = ethers.BigNumber.from("0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
    sha256(content) {
        return createHash('sha256').update(content).digest('hex')
    }

    constructor(rpcURL, bundlerUrl, entryPointAddress, ownerAccount, factoryAddress) {
        this.provider = new ethers.providers.JsonRpcProvider(rpcURL);
        this.ownerAccount = ownerAccount
        this.config = { bundlerUrl, entryPointAddress }
        this.bundlerUrl = bundlerUrl
        this.entryPointAddress = entryPointAddress
        this.factoryAddress = factoryAddress
        this.eoaAddr = this.ownerAccount.address
        this.contracts = {}
    }
    async init() {
        const net = await this.provider.getNetwork()
        this.chainId = net.chainId
        this.rpcClient = new HttpRpcClient(this.bundlerUrl, this.entryPointAddress, this.chainId)
        this.erc4337Provider = await wrapProvider(this.provider, this.config, this.ownerAccount, this.factoryAddress)

        this.accountApi = new TreasuryAPI({
            provider: this.erc4337Provider,
            entryPointAddress: this.entryPointAddress,  //check this
            owner: this.ownerAccount,
            factoryAddress: this.factoryAddress,
            index: 3
        })

        this.accountAddress = await this.accountApi.getAccountAddress()
        return this.accountAddress
    }

    async sendOpToBundler(op) {
        const userOpHash = await this.rpcClient.sendUserOpToBundler(op)
        const txid = await this.accountApi.getUserOpReceipt(userOpHash)
        return { userOpHash, txid }
    }

    static async getATokenAddress(poolAddr, underlyingAsset) {
        const poolABI = require("../../web3/build/contracts/IPool.json").abi
        const poolContract = new web3.eth.Contract(poolABI, poolAddr)
        const { aTokenAddress } = await poolContract.methods.getReserveData(underlyingAsset).call()
        return aTokenAddress
    }

    async createAAVETrackingPosition(key, aaveActionContract, aTokenAddr) {
        const userAddr = this.eoaAddr
        const aaveData = abi.encode(["address", "address", "string"], [userAddr, aTokenAddr, key]);
        const actionInitData = await aaveActionContract.getMethodEncoding("init", [aaveData])
        const op = await this.accountApi.createSignedUserOp({
            target: actionInitData.to,
            data: actionInitData.data,
        })
        return op
    }

    async executeAAVETrackingPosition(storageKey, aaveActionContract, treasuryContract) {
        const aaveexec = abi.encode(["string"], [storageKey])
        const actionExecuteCallData = await aaveActionContract.getMethodEncoding("execute", [aaveexec])
        const actionExecuteCall = await treasuryContract.sendMethodTx('callOp', [actionExecuteCallData.to, 0, actionExecuteCallData.data])
        console.log(actionExecuteCall)

        // const op = await this.accountApi.createSignedUserOp({
        //     target: actionExecuteCallData.to,
        //     data: actionExecuteCallData.data,
        //     gasLimit: 657355
        // })
        // return { op }
    }

    createContract(contract) {
        return new WrappedEthersContract(this.ownerAccount, this.chainId, contract, this.provider)
    }

    wrapMultipleContracts(contracts) {
        return contracts.map((contract => {
            return this.createContract(contract)
        }))
    }
}

class WrappedEthersContract {
    constructor(wallet, chainId, contract, provider) {
        this.wallet = wallet
        this.provider = provider
        this.chainId = chainId
        this.contract = contract
        this.address = contract.address
    }

    async calculateGas(method, params = []) {
        const gasLimit = await this.contract.estimateGas[method](...params).catch(() => (6000000))
        const gasPrice = await this.provider.getGasPrice();
        return { gasLimit, gasPrice }
    }

    async sendMethodTx(method, params = [], value = 0, nonceAdd = 0) {
        return await ethersTransaction(this.wallet, this.provider, this.chainId, this.contract, method, params, value, nonceAdd)
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


const ethersTransaction = async (wallet, provider, chainId, contract, method, params, value = 0, nonceAdd = 0) => {
    const estimatedGasLimit = await contract.estimateGas[method](...params)
    const approveTxUnsigned = await contract.populateTransaction[method](...params)
    approveTxUnsigned.gasLimit = estimatedGasLimit;
    approveTxUnsigned.gasPrice = await provider.getGasPrice();
    approveTxUnsigned.value = value;
    approveTxUnsigned.nonce = (await provider.getTransactionCount(wallet.address)) + nonceAdd;
    approveTxUnsigned.chainId = chainId;
    const approveTxSigned = await wallet.signTransaction(approveTxUnsigned);
    const submittedTx = await provider.sendTransaction(approveTxSigned);
    await submittedTx.wait()
    return submittedTx
}


const aaveTest = async () => {
    // initialize wallet
    const wallet = new FunWallet(url, bundlerUrl, entryPointAddress, ownerAccount, factoryAddress)
    // const baseWallet = userWallet.connect(provider)
    const treasuryAddr = await wallet.init()
    console.log("Treasury: ", treasuryAddr)



    // fund wallet

    const amount = "1000000374007307417"
    const entrypoint = new ethers.Contract(entryPointAddress, entrypointcontract, ownerAccount)
    const treasury = new ethers.Contract(treasuryAddr, Treasury.abi, ownerAccount)
    const action = new ethers.Contract(actionAddr, AaveLiquadation.abi, ownerAccount)
    const token = new ethers.Contract(tokenAddr, AToken.abi, ownerAccount)
    const [entryPointContract, treasuryContract, aaveActionContract, aTokenContract,] = wallet.wrapMultipleContracts([entrypoint, treasury, action, token,])


    // console.log(data)
    // const tx = await ownerAccount.sendTransaction({ value: ethers.utils.parseEther(".2"), to: treasuryAddr })
    // const r = await tx.wait()
    // console.log(r)

    const underlyingassetAddr = await aTokenContract.callMethod("UNDERLYING_ASSET_ADDRESS")
    const underlyingasset = new ethers.Contract(underlyingassetAddr, ERCToken.abi, ownerAccount)
    const UnderlyingAssetContract = wallet.createContract(underlyingasset)

    const preUserBalance = await aTokenContract.callMethod("balanceOf", [wallet.eoaAddr])
    const preTreasuryBalance = await aTokenContract.callMethod("balanceOf", [treasuryAddr])
    logBalances(preUserBalance, preTreasuryBalance, "Pre AToken Balance")

    const approveTokenTX = await aTokenContract.sendMethodTx("approve", [treasuryAddr, amount])
    console.log("Tokens Approved: ", approveTokenTX.hash)

    const preTreasuryAllowance = await aTokenContract.callMethod("allowance", [wallet.eoaAddr, treasuryAddr])
    logBalances(0, preTreasuryAllowance, "Pre Allowance")

    const key = "key1"
    const receipt = await aaveCreateTest(wallet, aaveActionContract, aTokenContract)
    console.log("Action Created: ", receipt)


    const rec = await aaveExecuteTest(wallet, key, aaveActionContract, treasuryContract)
    console.log("Execution Complete: ", rec)

    // const transferFromData = await aTokenContract.getMethodEncoding("transfer", [wallet.eoaAddr, preTreasuryBalance])
    // const actionExecuteCall = await treasuryContract.sendMethodTx('callOp', [transferFromData.to, 0, transferFromData.data])

    // const postTreasuryBalance = await aTokenContract.callMethod("balanceOf", [treasuryAddr])
    // const postUserBalance = await aTokenContract.callMethod("balanceOf", [wallet.eoaAddr])
    // logBalances(postUserBalance, postTreasuryBalance, "Post AToken Balance")

    // const underlyingassetBalance = await UnderlyingAssetContract.callMethod("balanceOf", [wallet.eoaAddr])
    // console.log("Underlying Asset User Balance: ", underlyingassetBalance.toString())

}


aaveTest()

const logBalances = (u, t, title) => {
    console.log(`${title} - Treasury: ${t.toString()} User: ${u.toString()}`)
}


const aaveCreateTest = async (wallet, aaveActionContract, aTokenContract) => {
    //create and send user op
    let op = await wallet.createAAVETrackingPosition("key1", aaveActionContract, aTokenContract.address)
    return await wallet.sendOpToBundler(op)

}


const aaveExecuteTest = async (wallet, key, aaveActionContract, treasuryContract) => {
    // let { op } = await wallet.executeAAVETrackingPosition( key)
    // const receipt = await wallet.sendOpToBundler(op)

    const receipt = await wallet.executeAAVETrackingPosition(key, aaveActionContract, treasuryContract)
    return receipt
}