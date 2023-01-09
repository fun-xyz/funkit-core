const { createHash } = require("crypto")
const fetch = require("node-fetch")
const { wrapProvider } = require("../utils/Provider")
const { TreasuryAPI } = require("../utils/TreasuryAPI")
const CryptoJS = require("crypto-js")


const { WrappedEthersContract, wrapMultipleContracts } = require("../utils/WrappedEthersContract")

const { HttpRpcClient } = require('@account-abstraction/sdk')

const AaveLiquadation = require("../utils/abis/AaveLiquadation.json")
const ERCToken = require('../utils/abis/ERC20.json');

const ethers = require('ethers')

const abi = ethers.utils.defaultAbiCoder;


class FunWallet {
    /**
    * Standard constructor
    * @params eoa, preFundAmt, index
    * eoa - ethers.Wallet object
    * preFundAmt - amount to prefund the wallet with, in eth/avax
    * index - index of account (default 0)
    */
    constructor() {

    }


    static AAVEWalletParams(tokenAddress) {
        return { tokenAddress }
    }

    static bundlerUrl = "http://54.184.167.23:3000/rpc"

    // static bundlerUrl = "http://localhost:3000/rpc"
    // bundlerUrl = "http://localhost:3000/rpc"


    static rpcurl = "https://avalanche-fuji.infura.io/v3/4a1a0a67f6874be6bb6947a62792dab7"
    static entryPointAddress = "0xCf64E11cd6A6499FD6d729986056F5cA7348349D"
    static factoryAddress = "0xCb8b356Ab30EA87d62Ed1B6C069Ef3E51FaDF749"
    static AaveActionAddress = "0x672d9623EE5Ec5D864539b326710Ec468Cfe0aBE"
    static MAX_INT = "0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"

    bundlerUrl = "http://54.184.167.23:3000/rpc"
    rpcurl = "https://avalanche-fuji.infura.io/v3/4a1a0a67f6874be6bb6947a62792dab7"
    entryPointAddress = "0xCf64E11cd6A6499FD6d729986056F5cA7348349D"
    factoryAddress = "0xCb8b356Ab30EA87d62Ed1B6C069Ef3E51FaDF749"
    AaveActionAddress = "0x672d9623EE5Ec5D864539b326710Ec468Cfe0aBE"
    MAX_INT = "0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"

    _sha256(content) {
        return CryptoJS.SHA256(content).toString(CryptoJS.enc.Hex)
    }
    /**     
    * Runs initialization for a given wallet.
    * The function acts as a constructor for many parameters in the class, creating
    * an abstracted wallet account, with the correct providers and rpc client. 
    * It also prefunds the account with the amount of eth/avax desired.
    * 
    * USER SIGNATURE REQUIRED to fund wallet
    * 
    * @params eoa, preFundAmt, index
    * eoa - ethers.Wallet object (user's eoa account)
    * preFundAmt - amount to prefund the wallet with, in eth/avax
    * index - index of account (default 0)
    */
    async init(eoa, preFundAmt, index = 0) {
        console.log(this._sha256("asdfasfsd"))
        this.eoa = eoa
        this.preFundAmt = preFundAmt
        this.index = index
        this.provider = new ethers.providers.JsonRpcProvider(this.rpcurl);
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
            //
            const tx = await this.eoa.sendTransaction({ to: this.address, from: await this.eoa.getAddress(), value: ethers.utils.parseEther(this.preFundAmt) })
            const fundReceipt = await tx.wait()
            console.log("Wallet has been Funded:\n", fundReceipt)
        }
    }

    async _sendOpToBundler(op) {
        const userOpHash = await this.rpcClient.sendUserOpToBundler(op)
        const txid = await this.accountApi.getUserOpReceipt(userOpHash)
        return { userOpHash, txid }
    }

    static async _sendOpToBundlerStatic(op) {
        const provider = new ethers.providers.JsonRpcProvider(this.rpcurl);
        const chainId = (await provider.getNetwork()).chainId
        const rpcClient = new HttpRpcClient(this.bundlerUrl, this.entryPointAddress, chainId)
        const accountApi = new TreasuryAPI({
            provider: provider,
            entryPointAddress: this.entryPointAddress,  //check this
            factoryAddress: this.factoryAddress
        })
        const userOpHash = await rpcClient.sendUserOpToBundler(op)
        const txid = await accountApi.getUserOpReceipt(userOpHash)
        return { userOpHash, txid }
    }

    async _createTokenApprovalTx(amount = this.MAX_INT) {
        return await this.tokenContract.createSignedTransaction("approve", [this.address, amount])
    }
    /**
    * adds type of action for FunWallet
    * @params type, params
    * type - string of "AAVE" (uniswap and more will be supported later)
    * params - parameters to insert, (token address)
    */
    async addAction(type, ...params) {
        this.walletType = type
        const aaveWalletOps = await this._createWallet(type, params)
        this.createWalletOP = aaveWalletOps.walletCreationOp
        this.actionExecutionOpHash = aaveWalletOps.actionExecutionOpHash
    }

    async _createAction({ to, data }, gasLimit, noInit = false) {
        return await this.accountApi.createSignedUserOp({ target: to, data, noInit, gasLimit })
    }

    async _createWallet(type, params) {
        switch (type) {
            case "AAVE": {
                return await this._createAAVEWallet(params)
            }
        }
    }

    async _createAAVEWallet(params) {
        this.params = params
        const token = new ethers.Contract(this.params[0], ERCToken.abi, this.eoa)
        this.tokenContract = new WrappedEthersContract(this.eoa, this.provider, this.chainId, token)

        const eoaAddr = await this.eoa.getAddress()
        const input = [eoaAddr, this.tokenContract.address].toString()

        const key = this._sha256(input)
        const aaveData = abi.encode(["address", "address", "string"], [eoaAddr, this.tokenContract.address, key]);
        const actionInitData = await this.AaveActionContract.getMethodEncoding("init", [aaveData])

        const walletCreationOp = await this._createAction(actionInitData, 560000)

        const aaveexec = abi.encode(["string"], [key])
        const actionExecuteCallData = await this.AaveActionContract.getMethodEncoding("execute", [aaveexec])
        const actionExecutionOp = await this._createAction(actionExecuteCallData, 500000, true)

        const actionExecutionOpHash = await this._storeUserOp(actionExecutionOp)

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
    static async executeAction(opHash = "", userOp = false) {
        if (!userOp && opHash) {
            userOp = await this._getStoredUserOp(opHash)
        }
        return await this._sendOpToBundlerStatic(userOp)
    }

    async _storeUserOp(op) {
        const outOp = await this._getPromiseFromOp(op)
        const sig = this._sha256(outOp.signature.toString())
        await this._storeUserOpInternal(outOp, sig)
        return sig
    }
    async _getPromiseFromOp(op) {
        const out = {}
        await Promise.all(Object.keys(op).map(async (key) => {
            out[key] = await op[key]
        }))
        return out
    }

    static async _getStoredUserOp(opHash) {
        const op = await this._getUserOpInternal(opHash)
        Object.keys(op).map(key => {
            if (op[key].type == "BigNumber") {
                op[key] = ethers.BigNumber.from(op[key].hex)
            }
        })
        return op
    }

    static async _getUserOpInternal(userOpHash) {
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
    async _storeUserOpInternal(userOp, userOpHash) {
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
            const receipt = await this._sendOpToBundler(this.createWalletOP)
            return { receipt, executionHash: this.actionExecutionOpHash }
        } catch {
            const { walletCreationOp, actionExecutionOpHash } = await this._createWallet(this.walletType, this.params)
            const receipt = await this._sendOpToBundler(walletCreationOp)
            return { receipt, executionHash: actionExecutionOpHash }

        }
    }
    /**
    * Grants approval to controller wallet to liquidate funds
    * @return {receipt} 
    * receipt - TransactionReceipt of the approval confirmed on chain
    */
    async deployTokenApprovalTx() {
        const ethTx = await this._createTokenApprovalTx()
        const submittedTx = await this.eoa.sendTransaction(ethTx);
        return await submittedTx.wait()
    }


}

module.exports = { FunWallet }