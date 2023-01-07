require('dotenv').config();

const ethers = require('ethers')
const { createHash } = require("crypto")
const { HttpRpcClient, DeterministicDeployer, ERC4337EthersProvider } = require('@account-abstraction/sdk')
const { wrapProvider } = require("./Provider")
const { TreasuryAPI } = require("./treasuryapi")
const Tx = require('@ethereumjs/tx').Transaction;


const timeout = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms))
}

const treasuryAbi = require("../../web3/build/contracts/Treasury.json").abi
const treasuryfactbytecode = require("../../web3/build/contracts/TreasuryFactory.json").bytecode
const aaveActionContract = require("../../web3/build/contracts/AaveLiquadation.json").abi
const entrypointcontract = require("../../web3/build/contracts/EntryPoint.json")
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
const factoryAddress = "0x97E3a36026ab28269122c011d4C5e5435384f266"


const provider = new ethers.providers.JsonRpcProvider(url);
const ownerAccount = new ethers.Wallet("0x66f37ee92a08eebb5da72886f3c1280d5d1bd5eb8039f52fdb8062df7e364206", provider)
const userWallet = ethers.Wallet.fromMnemonic(process.env.MNEMONIC)

class FunWallet {
    MAX_INT = ethers.BigNumber.from("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
    sha256(content) {
        return createHash('sha256').update(content).digest('hex')
    }

    constructor(rpcURL, bundlerUrl, entryPointAddress, ownerAccount, factoryAddress) {
        this.provider = new ethers.providers.JsonRpcProvider(rpcURL);
        this.ownerAccount = ownerAccount.connect(this.provider)
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
        // this.ownerAccount.sendTransaction({ to: this.accountAddress, value: ethers.utils.parseEther(".3") })
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

    async getPreAAVEtransactions(tokenContract, amount = this.MAX_INT) {
        const approveTokenTX = await tokenContract.sendMethodTx("approve", [this.accountAddress, amount])
        return approveTokenTX
    }


    async createAAVETrackingPosition(storageKey = "") {
        const aaveActionContract = this.contracts.aaveActionContract
        const aTokenAddr = this.contracts.aTokenContract.address
        const userAddr = this.eoaAddr
        const hashinput = [userAddr, aTokenAddr, storageKey].toString()
        const key = this.sha256(hashinput)
        const aaveData = abi.encode(["address", "address", "string"], [userAddr, aTokenAddr, key]);
        const actionInitData = await aaveActionContract.getMethodEncoding("init", [aaveData])
        const op = await this.accountApi.createSignedUserOp({
            target: actionInitData.to,
            data: actionInitData.data,
        })
        return { op, key }
    }

    async executeAAVETrackingPosition(storageKey) {
        const aaveActionContract = this.contracts.aaveActionContract
        const aaveexec = abi.encode(["string"], [storageKey])
        const actionExecuteCallData = await aaveActionContract.getMethodEncoding("execute", [aaveexec])
        const op = await this.accountApi.createSignedUserOp({
            target: actionExecuteCallData.to,
            data: actionExecuteCallData.data,
            gasLimit: 80000000,
        })
        return { op }
    }

    createContract(contractObj) {
        const name = Object.keys(contractObj)[0]
        const contract = contractObj[name]
        const body = new WrappedEthersContract(this.ownerAccount, this.chainId, contract, this.provider)
        this.contracts[name] = body
        return body
    }

    wrapMultipleContracts(contracts) {
        contracts.map((contract => {
            this.createContract(contract)
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

    async sendMethodTx(method, params = [], nonceAdd = 0) {
        return await ethersTransaction(this.wallet, this.provider, this.chainId, this.contract, method, params, nonceAdd)
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


const aaveTest = async () => {
    // initialize wallet
    const wallet = new FunWallet(url, bundlerUrl, entryPointAddress, ownerAccount, factoryAddress)
    // const baseWallet = userWallet.connect(provider)

    const treasuryAddr = await wallet.init()
    console.log("Treasury: ", treasuryAddr)
    const tokenAddr = "0xC50E6F9E8e6CAd53c42ddCB7A42d616d7420fd3e"
    const actionAddr = "0x32e7C5085C1338c96095037C109Bb5b4B64d0384"

    // fund wallet
    await ownerAccount.sendTransaction({ to: treasuryAddr, value: ethers.utils.parseEther("1") })

    const amount = wallet.MAX_INT
    const treasury = new ethers.Contract(treasuryAddr, Treasury.abi, wallet.ownerAccount)
    const action = new ethers.Contract(actionAddr, AaveLiquadation.abi, wallet.ownerAccount)
    const token = new ethers.Contract(tokenAddr, AToken.abi, wallet.ownerAccount)
    wallet.wrapMultipleContracts([{ aTokenContract: token }, { treasuryContract: treasury }, { aaveActionContract: action }])

    const underlyingassetAddr = await wallet.contracts.aTokenContract.callMethod("UNDERLYING_ASSET_ADDRESS")
    const underlyingasset = new ethers.Contract(underlyingassetAddr, ERCToken.abi)
    wallet.createContract({ UnderlyingAssetContract: underlyingasset })

    const preUserBalance = await wallet.contracts.aTokenContract.callMethod("balanceOf", [wallet.eoaAddr])
    const preTreasuryBalance = await wallet.contracts.aTokenContract.callMethod("balanceOf", [treasuryAddr])
    logBalances(preUserBalance, preTreasuryBalance, "Pre AToken Balance")

    const approveTokenTX = await wallet.contracts.aTokenContract.sendMethodTx("approve", [treasuryAddr, amount])
    console.log("Tokens Approved: ", approveTokenTX.hash)

    const preTreasuryAllowance = await wallet.contracts.aTokenContract.callMethod("allowance", [wallet.eoaAddr, treasuryAddr])
    logBalances(0, preTreasuryAllowance, "Pre Allowance")


    const { receipt, key } = await aaveCreateTest(wallet)
    console.log("Action Created: ", receipt)
    console.log("Key: ", key)
    await timeout(4000)
    const rec = await aaveExecuteTest(wallet, key)
    console.log("Execution Complete: ", rec)

    const postTreasuryBalance = await wallet.contracts.aTokenContract.callMethod("balanceOf", [treasuryAddr])
    const postUserBalance = await wallet.contracts.aTokenContract.callMethod("balanceOf", [wallet.eoaAddr])
    logBalances(postUserBalance, postTreasuryBalance, "Post AToken Balance")

    const underlyingassetBalance = await wallet.contracts.UnderlyingAssetContract.callMethod("balanceOf", [wallet.eoaAddr])
    console.log("Underlying Asset User Balance: ", underlyingassetBalance.toString())
}

aaveTest()

const logBalances = (u, t, title) => {
    console.log(`${title} - Treasury: ${t.toString()} User: ${u.toString()}`)
}


const aaveCreateTest = async (wallet) => {
    //create and send user op
    let { op, key } = await wallet.createAAVETrackingPosition()
    const receipt = await wallet.sendOpToBundler(op)
    return { receipt, key }
}


const aaveExecuteTest = async (wallet, key) => {
    let { op } = await wallet.executeAAVETrackingPosition(key)
    const receipt = await wallet.sendOpToBundler(op)
    return receipt
}