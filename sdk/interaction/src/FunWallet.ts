const ethers = require('ethers')
const { createHash } = require("crypto")
const { wrapProvider, HttpRpcClient, DeterministicDeployer } = require('@account-abstraction/sdk')
const { TreasuryAPI } = require("./treasuryapi")
const actionContract = require("../../web3/build/contracts/AaveLiquadation.json").abi

const Web3 = require('web3')


export class FunWallet {
    MAX_INT = ethers.BigNumber.from("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
    provider:any
    config:any
    bundlerUrl:any
    entryPointAddress:any
    ownerAccount:any
    factoryAddress:any
    erc4337Provider:any
    rpcClient:any
    accountApi:any
    accountAddress:any
    web3:any
    sha256(content:any) {
        return createHash('sha256').update(content).digest('hex')
    }

    constructor(rpcURL:any, bundlerUrl:any, entryPointAddress:any, ownerAccount:any, factoryAddress:any) {
        this.provider = new ethers.providers.JsonRpcProvider(rpcURL);
        this.config = { bundlerUrl, entryPointAddress }
        this.bundlerUrl = bundlerUrl
        this.entryPointAddress = entryPointAddress
        this.ownerAccount = ownerAccount
        this.factoryAddress = factoryAddress
        this.web3 = new Web3(rpcURL);
    }
    async init() {
        this.erc4337Provider = await wrapProvider(
            this.provider,
            this.config,
            this.ownerAccount
        )

        await DeterministicDeployer.init(this.provider)

        const net = await this.erc4337Provider.getNetwork()
        const accs = await this.web3.eth.getAccounts()
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

    async sendOpToBundler(op:any) {
        const userOpHash = await this.rpcClient.sendUserOpToBundler(op)
        const txid = await this.accountApi.getUserOpReceipt(userOpHash)
        return { userOpHash, txid }
    }

    async getPreAAVEtransactions(aTokenAddr:any, from:any, amount:any = this.MAX_INT) {
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


        const atokenContract = new this.web3.eth.Contract(contractABI, aTokenAddr, { from });
        amount = this.web3.utils.toHex(amount)
        let nonce = await this.web3.eth.getTransactionCount(from)
        let rawTransaction = {
            'from': from,
            'gasPrice': this.web3.utils.toHex(20 * 1e9),
            'gasLimit': this.web3.utils.toHex(210000),
            'to': aTokenAddr,
            'data': atokenContract.methods.approve(controllerAddress, amount).encodeABI(),
            'nonce': this.web3.utils.toHex(nonce),
        }
        return rawTransaction
    }

    async createAAVETrackingPosition(actionAddr:any, userAddr:any, aTokenAddr:any, positionMax:any, storageKey = "") {
        const aavactioncontract = await new this.web3.eth.Contract(actionContract);
        const hashinput = [userAddr, aTokenAddr, positionMax, storageKey].toString()
        const key = this.sha256(hashinput)
        const aavedata = this.web3.eth.abi.encodeParameters(["address", "address", "uint256", "string"], [userAddr, aTokenAddr, positionMax, key]);
        const aavecall = aavactioncontract.methods.init(aavedata)
        const op = await this.accountApi.createSignedUserOp({
            target: actionAddr,
            data: aavecall.encodeABI(),
        })
        return { op, key }
    }

    async executeAAVETrackingPosition(actionAddr:any, storageKey:any) {
        const aavactioncontract = await new this.web3.eth.Contract(actionContract);
        const aavedata = this.web3.eth.abi.encodeParameters(["string"], [storageKey]);
        const aavecall = aavactioncontract.methods.execute(aavedata)
        const op = await this.accountApi.createSignedUserOp({
            target: actionAddr,
            data: aavecall.encodeABI()
        })
        return { op }
    }
}
