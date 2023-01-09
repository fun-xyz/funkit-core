const { createHash } = require("crypto")
const fetch = require("node-fetch")
const { wrapProvider } = require("../utils/Provider")
const { TreasuryAPI } = require("../utils/TreasuryAPI")

const { WrappedEthersContract, wrapMultipleContracts } = require("../utils/WrappedEthersContract")

const { HttpRpcClient } = require('@account-abstraction/sdk')

const AaveLiquadation = require("../utils/abis/AaveLiquadation.json")
const ERCToken = require('../utils/abis/ERC20.json');

const ethers = require('ethers')

const abi = ethers.utils.defaultAbiCoder;


class FunWallet {
    constructor(eoa, preFundAmt, index = 0) {
        this.eoa = eoa
        this.preFundAmt = preFundAmt
        this.index = index
    }


    static AAVEWalletParams(tokenAddress) {
        return { tokenAddress }
    }


    rpcurl = "https://avalanche-fuji.infura.io/v3/4a1a0a67f6874be6bb6947a62792dab7"
    bundlerUrl = "http://35.90.110.76:3000/rpc"
    // bundlerUrl = "http://localhost:3000/rpc"

    entryPointAddress = "0xCf64E11cd6A6499FD6d729986056F5cA7348349D"
    factoryAddress = "0xCb8b356Ab30EA87d62Ed1B6C069Ef3E51FaDF749"
    AaveActionAddress = "0x672d9623EE5Ec5D864539b326710Ec468Cfe0aBE"
    MAX_INT = "0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"

    sha256(content) {
        return createHash('sha256').update(content).digest('hex')
    }

    async init() {
        this.provider = new ethers.providers.JsonRpcProvider(this.rpcurl);
        this.eoa = this.eoa.connect(this.provider)

        this.config = { bundlerUrl: this.bundlerUrl, entryPointAddress: this.entryPointAddress }

        const AaveAction = new ethers.Contract(this.AaveActionAddress, AaveLiquadation.abi, this.eoa)
        this.AaveActionContract = new WrappedEthersContract(this.eoa, this.provider, this.chainId, AaveAction)
        const net = await this.provider.getNetwork()
        this.chainId = net.chainId
        this.rpcClient = new HttpRpcClient(this.bundlerUrl, this.entryPointAddress, this.chainId)
        this.erc4337Provider = await wrapProvider(this.provider, this.config, this.eoa, this.factoryAddress)

        this.accountApi = new TreasuryAPI({
            provider: this.erc4337Provider,
            entryPointAddress: this.entryPointAddress,  //check this
            owner: this.eoa,
            factoryAddress: this.factoryAddress,
            index: this.index
        })

        this.address = await this.accountApi.getAccountAddress()
        if (parseFloat(this.preFundAmt) > 0) {
            const tx = await this.eoa.sendTransaction({ to: this.address, from: this.eoa.address, value: ethers.utils.parseEther(this.preFundAmt) })
            const fundReceipt = await tx.wait()
            console.log("Wallet has been Funded:\n", fundReceipt)
        }
    }

    async sendOpToBundler(op) {
        const userOpHash = await this.rpcClient.sendUserOpToBundler(op)
        const txid = await this.accountApi.getUserOpReceipt(userOpHash)
        return { userOpHash, txid }
    }

    async createTokenApprovalTx(amount = this.MAX_INT) {
        return await this.tokenContract.createSignedTransaction("approve", [this.address, amount])
    }

    async addAction(type, ...params) {
        this.walletType = type
        const aaveWalletOps = await this.createWallet(type, params)
        this.createWalletOP = aaveWalletOps.walletCreationOp
        this.actionExecutionOpHash = aaveWalletOps.actionExecutionOpHash
    }

    async createAction({ to, data }, gasLimit, noInit = false) {
        return await this.accountApi.createSignedUserOp({ target: to, data, noInit, gasLimit })
    }

    async createWallet(type, params) {
        switch (type) {
            case "AAVE": {
                return await this.createAAVEWallet(params)
            }
        }
    }

    async createAAVEWallet(params) {
        const token = new ethers.Contract(params[0], ERCToken.abi, this.eoa)
        this.tokenContract = new WrappedEthersContract(this.eoa, this.provider, this.chainId, token)

        const eoaAddr = this.eoa.address
        const input = [eoaAddr, this.tokenContract.address].toString()

        const key = this.sha256(input)
        const aaveData = abi.encode(["address", "address", "string"], [eoaAddr, this.tokenContract.address, key]);
        const actionInitData = await this.AaveActionContract.getMethodEncoding("init", [aaveData])

        const walletCreationOp = await this.createAction(actionInitData, 560000)

        const aaveexec = abi.encode(["string"], [key])
        const actionExecuteCallData = await this.AaveActionContract.getMethodEncoding("execute", [aaveexec])
        const actionExecutionOp = await this.createAction(actionExecuteCallData, 500000, true)

        const actionExecutionOpHash = await this.storeUserOp(actionExecutionOp)

        return {
            walletCreationOp,
            actionExecutionOpHash
        }
    }
    /**
    * Liquidates one's aave position
    * @params opHash - execution hash from deploying the wallet
    * @return {receipt, executionHash} 
    * userOpHash - string hash of the UserOperation 
    * txid - transaction id of transfer of assets
    */
    async executeAction(opHash = "", userOp = false) {
        if (!userOp && opHash) {
            userOp = await this.getStoredUserOp(opHash)
        }

        return await this.sendOpToBundler(userOp)
    }

    async storeUserOp(op) {
        const outOp = await this.getPromiseFromOp(op)
        const sig = this.sha256(outOp.toString())
        await this.storeUserOpInternal(outOp, sig)
        return sig
    }
    async getPromiseFromOp(op) {
        const out = {}
        await Promise.all(Object.keys(op).map(async (key) => {
            out[key] = await op[key]
        }))
        return out
    }

    async getStoredUserOp(opHash) {
        const op = await this.getUserOpInternal(opHash)
        Object.keys(op).map(key => {
            if (op[key].type == "BigNumber") {
                op[key] = ethers.BigNumber.from(op[key].hex)
            }
        })
        return op
    }

    async getUserOpInternal(userOpHash) {
        return await fetch('https://fun-mvp-api.herokuapp.com/getUserOp', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            redirect: 'follow',
            referrerPolicy: 'no-referrer',
            body: JSON.stringify({
                userOpHash: userOpHash,
            })
        }).then((r) => r.json()).then((r) => { return r })
    }
    async storeUserOpInternal(userOp, userOpHash) {
        await fetch('https://fun-mvp-api.herokuapp.com/storeUserOp', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            redirect: 'follow',
            referrerPolicy: 'no-referrer',
            body: JSON.stringify({
                userOpHash: userOpHash,
                userOp: userOp
            })
        })
    }

    /**
    * Deploys a wallet to chain that can initiate aave liquidation
    * @return {receipt, executionHash} 
    * receipt - receipt of transaction committed to chain.
    * executionHash - string hash of the UserOperation 
    */
    async deployWallet() {

        try {
            const receipt = await this.sendOpToBundler(this.createWalletOP)
            return { receipt, executionHash: this.actionExecutionOpHash }
        } catch {
            const { walletCreationOp, actionExecutionOpHash } = await this.createWallet(this.walletType)
            const receipt = await this.sendOpToBundler(walletCreationOp)
            return { receipt, executionHash: actionExecutionOpHash }

        }
    }
    /**
    * Grants approval to controller wallet to liquidate funds
    * @return {receipt} 
    * receipt - TransactionReceipt of the approval confirmed on chain
    */
    async deployTokenApprovalTx() {
        const ethTx = await this.createTokenApprovalTx()
        const submittedTx = await this.provider.sendTransaction(ethTx);
        return await submittedTx.wait()
    }


}

module.exports = { FunWallet }