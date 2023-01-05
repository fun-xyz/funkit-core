const ethers = require('ethers')
const { createHash } = require("crypto")
const { wrapProvider, HttpRpcClient, DeterministicDeployer } = require('@account-abstraction/sdk')
const { TreasuryAPI } = require("./treasuryapi")

const treasuryAbi = require("../../web3/build/contracts/Treasury.json").abi
const treasuryfactbytecode = require("../../web3/build/contracts/TreasuryFactory.json").bytecode
const actionContract = require("../../web3/build/contracts/AaveLiquadation.json").abi
const entrypointcontract = require("../../web3/build/contracts/EntryPoint.json")

const url = "http://localhost:8545"


const Web3 = require('web3')
const web3 = new Web3(url);

const factoryAddress = "0xcc783140446C68edC7B3C601E63665E17e232eE8"
const entryPointAddress = "0x1306b01bC3e4AD202612D3843387e94737673F53"
const aaveActionAddr = "0x4026F10CAB74300fC2AF54215532d0b75088FcE2"
const key = "key1"




const getEntryPointLogs = async () => {
    const entrypoint = await new web3.eth.Contract(entrypointcontract.abi, entryPointAddress);
    const events = await entrypoint.getPastEvents('UserOperationEvent');
    console.log(events)


}
const main = async () => {
    const aavactioncontract = await new web3.eth.Contract(actionContract, aaveActionAddr);

    const getTestData = async (key) => {
        const data = await aavactioncontract.methods.requests(key).call()
        // const out = web3.eth.abi.decodeParameters(["address", "address", "uint256", "string"], data)
        console.log(data)

    }

    const sendTestOP = async (addr, calldata) => {
        const accs = await web3.eth.getAccounts()
        await web3.eth.sendTransaction({ to: addr, from: accs[0], data: calldata })
        await getTestData()

    }

    const config = {
        entryPointAddress,
        bundlerUrl: 'http://localhost:3000/rpc'
    }

    // use this as signer (instead of node's first account)

    const ownerAccount = new ethers.Wallet(privateKey = "0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356")
    const erc4337Provider = await wrapProvider(
        provider,
        config,
        ownerAccount
    )

    await DeterministicDeployer.init(provider)

    const net = await erc4337Provider.getNetwork()
    const accs = await web3.eth.getAccounts()
    const rpcClient = new HttpRpcClient(config.bundlerUrl, config.entryPointAddress, net.chainId)

    const accountApi = new TreasuryAPI({
        provider: erc4337Provider,
        entryPointAddress: config.entryPointAddress,  //check this
        owner: ownerAccount,
        factoryAddress,
        index: 3
    })

    const accountAddress = await accountApi.getAccountAddress()
    await web3.eth.sendTransaction({ to: accountAddress, from: accs[0], value: web3.utils.toWei("10", "ether") })

    const aavedata = web3.eth.abi.encodeParameters(["address", "address", "uint256", "string"], ['0x76ca03a67C049477FfB09694dFeF00416dB69746', '0x39dD11C243Ac4Ac250980FA3AEa016f73C509f37', '10', key]);

    createAAVETrackingPosition

    // const aavedata2 = web3.eth.abi.encodeParameters(["address", "address", "uint256", "string"], ['0x76ca03a67C049477FfB09694dFeF00416dB69746', '0x39dD11C243Ac4Ac250980FA3AEa016f73C509f37', '10', "key2"]);
    // const aavecall2 = aavactioncontract.methods.init(aavedata2)
    // await web3.eth.sendTransaction({ to: aaveActionAddr, from: accs[0], data: aavecall2.encodeABI() })

    try {

        // console.log(op)
        // await sendTestOP(accountAddress, encodeCallOp(aaveActionAddr, aavecall.encodeABI()))
        // await sendTestOP(aaveActionAddr, aavecall.encodeABI())
        const userOpHash = await rpcClient.sendUserOpToBundler(op)
        const txid = await accountApi.getUserOpReceipt(userOpHash)
        // const receipt = await rpcClient.userOpJsonRpcProvider
        //     .send('eth_getUserOperationReceipt', [userOpHash]);
        console.log('reqId', userOpHash, 'txid=', txid)
        // console.log(JSON.stringify(receipt))
    } catch (e) {
        console.log(e.error)
    }

    await getTestData()
}

const encodeCallOp = (addr, data, value = "0") => {
    return web3.eth.abi.encodeFunctionCall({
        "inputs": [
            {
                "internalType": "address",
                "name": "addr",
                "type": "address"
            },
            {
                "internalType": "uint256",
                "name": "value",
                "type": "uint256"
            },
            {
                "internalType": "bytes",
                "name": "data",
                "type": "bytes"
            }
        ],
        "name": "callOp",
        "outputs": [
            {
                "internalType": "bytes",
                "name": "",
                "type": "bytes"
            }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
    }, [addr, value, data])
}



class FunWallet {
    MAX_INT = ethers.BigNumber.from("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
    sha256(content) {
        return createHash('sha256').update(content).digest('hex')
    }

    constructor(rpcURL, bundlerUrl, entryPointAddress, ownerAccount, factoryAddress) {
        this.provider = new ethers.providers.JsonRpcProvider(rpcURL);
        this.config = { bundlerUrl, entryPointAddress }
        this.bundlerUrl = bundlerUrl
        this.entryPointAddress = entryPointAddress
        this.ownerAccount = ownerAccount
        this.factoryAddress = factoryAddress
    }
    async init() {
        this.erc4337Provider = await wrapProvider(
            this.provider,
            this.config,
            this.ownerAccount
        )

        await DeterministicDeployer.init(this.provider)

        const net = await this.erc4337Provider.getNetwork()
        const accs = await web3.eth.getAccounts()
        this.rpcClient = new HttpRpcClient(this.bundlerUrl, this.entryPointAddress, net.chainId)

        this.accountApi = new TreasuryAPI({
            provider: this.erc4337Provider,
            entryPointAddress: this.entryPointAddress,  //check this
            owner: this.ownerAccount,
            factoryAddress: this.factoryAddress,
            // index: 3
        })

        this.accountAddress = await this.accountApi.getAccountAddress()
        return this.accountAddress
    }

    async sendOpToBundler(op) {
        const userOpHash = await this.rpcClient.sendUserOpToBundler(op)
        const txid = await this.accountApi.getUserOpReceipt(userOpHash)
        return { userOpHash, txid }
    }

    async getPreAAVEtransactions(aTokenAddr, from, amount = MAX_INT) {
        // approve
        let contractABI = [
            {
                "inputs": [
                    {
                        "internalType": "address",
                        "name": "spender",
                        "type": "address"
                    },
                    {
                        "internalType": "uint256",
                        "name": "amount",
                        "type": "uint256"
                    }
                ],
                "name": "approve",
                "outputs": [
                    {
                        "internalType": "bool",
                        "name": "",
                        "type": "bool"
                    }
                ],
                "stateMutability": "nonpayable",
                "type": "function"
            },
        ]


        const atokenContract = new web3.eth.Contract(contractABI, aTokenAddr, { from });
        amount = web3.utils.toHex(amount)
        let nonce = await web3.eth.getTransactionCount(from)
        let rawTransaction = {
            'from': from,
            'gasPrice': web3.utils.toHex(20 * 1e9),
            'gasLimit': web3.utils.toHex(210000),
            'to': aTokenAddr,
            'data': atokenContract.methods.approve(controllerAddress, amount).encodeABI(),
            'nonce': web3.utils.toHex(nonce),
        }
        return rawTransaction
    }

    async createAAVETrackingPosition(actionAddr, userAddr, aTokenAddr, positionMax, storageKey = "") {
        const aavactioncontract = await new web3.eth.Contract(actionContract);
        const hashinput = [userAddr, aTokenAddr, positionMax, storageKey].toString()
        const key = sha256(hashinput)
        const aavedata = web3.eth.abi.encodeParameters(["address", "address", "uint256", "string"], [userAddr, aTokenAddr, positionMax, key]);
        const aavecall = aavactioncontract.methods.init(aavedata)
        const op = await this.accountApi.createSignedUserOp({
            target: actionAddr,
            data: aavecall.encodeABI()
        })
        return { op, key }
    }

    async executeAAVETrackingPosition(actionAddr, storageKey) {
        const aavactioncontract = await new web3.eth.Contract(actionContract);
        const aavedata = web3.eth.abi.encodeParameters(["string"], [storageKey]);
        const aavecall = aavactioncontract.methods.execute(aavedata)
        const op = await this.accountApi.createSignedUserOp({
            target: actionAddr,
            data: aavecall.encodeABI()
        })
        return { op }
    }
}

const getTestData = async (address, key) => {
    const aavactioncontract = await new web3.eth.Contract(actionContract, address);
    const data = await aavactioncontract.methods.requests(key).call()
    const out = web3.eth.abi.decodeParameters(["address", "address", "uint256", "string"], data)
    console.log(out)
}

const aaveCreateTest = async (wallet) => {
    //create and send user op
    let { op, key } = await wallet.createAAVETrackingPosition(aaveActionAddr, '0x76ca03a67C049477FfB09694dFeF00416dB69746', '0x39dD11C243Ac4Ac250980FA3AEa016f73C509f37', '10')
    const receipt = await wallet.sendOpToBundler(op)
    // getTestData(aaveActionAddr, key)
    return key
}

const aaveExecuteTest = async (wallet, key) => {
    let { op } = await wallet.executeAAVETrackingPosition(aaveActionAddr, key)
    const receipt = await wallet.sendOpToBundler(op)
    console.log(receipt)
}

const aaveTest = async () => {
    const ownerAccount = new ethers.Wallet(privateKey = "0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356")
    // initialize wallet
    const wallet = new FunWallet(url, 'http://localhost:3000/rpc', entryPointAddress, ownerAccount, factoryAddress)
    const address = await wallet.init()
    //fund wallet
    const accs = await web3.eth.getAccounts()
    await web3.eth.sendTransaction({ to: address, from: accs[0], value: web3.utils.toWei("10", "ether") })

    const key = await aaveCreateTest(wallet)
    await aaveExecuteTest(wallet, key)
}


aaveTest()