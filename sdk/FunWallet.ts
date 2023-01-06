// const ethers = require('ethers')
// const { createHash } = require("crypto")
// const { wrapProvider, HttpRpcClient, DeterministicDeployer } = require('@account-abstraction/sdk')
// const { TreasuryAPI } = require("./treasuryapi")
// const actionContract = require("../../web3/build/contracts/AaveLiquadation.json").abi

// const Web3 = require('web3')
import { UserOperationStruct } from "@account-abstraction/contracts"
import { ethers } from "ethers"
const fetch = require('node-fetch');
// import { FunWallet } from "./FunWallet"

const Common = require("ethereumjs-common")
const Web3 = require('web3')
const Tx = require('ethereumjs-tx').Transaction



export class FunWallet {
    getUnsignedAuthTx = async (from: string, controllerAddress: string, erc20Addr: string, amount: number, type: string) => {
        if (type === 'aave') {
            let contractABI = [
                // transfer
                {
                    'constant': false,
                    'inputs': [
                        {
                            'name': '_to',
                            'type': 'address'
                        },
                        {
                            'name': '_value',
                            'type': 'uint256'
                        }
                    ],
                    'name': 'transfer',
                    'outputs': [
                        {
                            'name': '',
                            'type': 'bool'
                        }
                    ],
                    'type': 'function'
                }
            ]


            let myContract = new web3.eth.Contract(contractABI, erc20Addr, { from: from });
            // amount = web3.utils.toHex(amount) 
            amount = web3.utils.toHex(amount)

            let nonce = await web3.eth.getTransactionCount(from)
            // let nonce=web3.utils.toHex(9)
            console.log(nonce)
            let rawTransaction = {
                'from': from,
                'gasPrice': web3.utils.toHex(20 * 1e10),
                'gasLimit': web3.utils.toHex(5000000),
                'to': erc20Addr,
                'value': 0x0,
                'data': myContract.methods.transfer(controllerAddress, amount).encodeABI(),
                'nonce': web3.utils.toHex(nonce),
                'chainId': 5
            }


            return rawTransaction
        }
        else if (type === 'uniswap') {

        }
        else {
            throw new Error('unsupported token')
            return {}
        }

    }

    getSignedAuthTx = (rawTx: any, privateKey: any, chainId: number) => {
        chainId = web3.utils.toHex(chainId).toString()
        const customCommon = Common.default.forCustomChain(
            'mainnet',
            {
                name: "yourNetwork",
                chainId: chainId,
                networkId: chainId
            },
            "petersburg",
        )

        const tx = new Tx(rawTx, { common: customCommon })
        tx.sign(privateKey)
        console.log(tx)
        let serializedTx = '0x' + tx.serialize().toString('hex');
        return serializedTx
    }

    deployEthTx = (signedTx: any) => { //forward to rpc
        web3.eth.sendSignedTransaction(signedTx).on('transactionHash', function (txHash: any) {
            console.log(txHash)
        }).on('receipt', function (receipt: any) {
            console.log("receipt:" + JSON.stringify(receipt));
        })
    }

    getSignedUserOp = async (wallet: any, actionAddr: string, type: string) => {
        if (type === 'aave') {
            let { op, key } = await wallet.createAAVETrackingPosition(actionAddr, '0x76ca03a67C049477FfB09694dFeF00416dB69746', '0x39dD11C243Ac4Ac250980FA3AEa016f73C509f37', '10')
            const receipt = await wallet.sendOpToBundler(op)
            await this.storeUserOp(op, key)
            return key
        }
        else if (type === 'uniswap') {

            return ''
        }
        else {
            throw new Error(`${type} of wallet is not available`)
            return null
        }
    }


    executeUserOp = async (wallet: any, key: string, actionAddr: string) => {
        let { op } = await wallet.executeAAVETrackingPosition(actionAddr, key)
        const receipt = await wallet.sendOpToBundler(op)
        console.log(receipt)
    }


    storeUserOp = async (userOp: UserOperationStruct, userOpHash: string) => {
        fetch('https://fun-mvp-api.herokuapp.com/storeUserOp', {
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
    getUserOp = async (userOpHash: string) => {
        fetch('https://fun-mvp-api.herokuapp.com/getUserOp', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            redirect: 'follow',
            referrerPolicy: 'no-referrer',
            body: JSON.stringify({
                userOpHash: userOpHash,
            })
        }).then((r: any) => r.json()).then((r: any) => { return r })

    }




    //     MAX_INT = ethers.BigNumber.from("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
    //     provider:any
    //     config:any
    //     bundlerUrl:any
    //     entryPointAddress:any
    //     ownerAccount:any
    //     factoryAddress:any
    //     erc4337Provider:any
    //     rpcClient:any
    //     accountApi:any
    //     accountAddress:any
        // web3:any
    //     sha256(content:any) {
    //         return createHash('sha256').update(content).digest('hex')
    //     }

    //     constructor(rpcURL:any, bundlerUrl:any, entryPointAddress:any, ownerAccount:any, factoryAddress:any) {
    //         this.provider = new ethers.providers.JsonRpcProvider(rpcURL);
    //         this.config = { bundlerUrl, entryPointAddress }
    //         this.bundlerUrl = bundlerUrl
    //         this.entryPointAddress = entryPointAddress
    //         this.ownerAccount = ownerAccount
    //         this.factoryAddress = factoryAddress
    //         this.web3 = new Web3(rpcURL);
    //     }
    //     async init() {
    //         this.erc4337Provider = await wrapProvider(
    //             this.provider,
    //             this.config,
    //             this.ownerAccount
    //         )

    //         await DeterministicDeployer.init(this.provider)

    //         const net = await this.erc4337Provider.getNetwork()
    //         const accs = await this.web3.eth.getAccounts()
    //         this.rpcClient = new HttpRpcClient(this.bundlerUrl, this.entryPointAddress, net.chainId)

    //         this.accountApi = new TreasuryAPI({
    //             provider: this.erc4337Provider,
    //             entryPointAddress: this.entryPointAddress,  //check this
    //             owner: this.ownerAccount,
    //             factoryAddress: this.factoryAddress,
    //             // index: 3
    //         })

    //         this.accountAddress = await this.accountApi.getAccountAddress()
    //         return this.accountAddress
    //     }

    //     async sendOpToBundler(op:any) {
    //         const userOpHash = await this.rpcClient.sendUserOpToBundler(op)
    //         const txid = await this.accountApi.getUserOpReceipt(userOpHash)
    //         return { userOpHash, txid }
    //     }

    //     async getPreAAVEtransactions(aTokenAddr:any, from:any, amount:any = this.MAX_INT) {
    //         // approve
    //         let contractABI = [
    //             {
    //                 "inputs": [
    //                     {
    //                         "internalType": "address",
    //                         "name": "spender",
    //                         "type": "address"
    //                     },
    //                     {
    //                         "internalType": "uint256",
    //                         "name": "amount",
    //                         "type": "uint256"
    //                     }
    //                 ],
    //                 "name": "approve",
    //                 "outputs": [
    //                     {
    //                         "internalType": "bool",
    //                         "name": "",
    //                         "type": "bool"
    //                     }
    //                 ],
    //                 "stateMutability": "nonpayable",
    //                 "type": "function"
    //             },
    //         ]


    //         const atokenContract = new this.web3.eth.Contract(contractABI, aTokenAddr, { from });
    //         amount = this.web3.utils.toHex(amount)
    //         let nonce = await this.web3.eth.getTransactionCount(from)
    //         let rawTransaction = {
    //             'from': from,
    //             'gasPrice': this.web3.utils.toHex(20 * 1e9),
    //             'gasLimit': this.web3.utils.toHex(210000),
    //             'to': aTokenAddr,
    //             'data': atokenContract.methods.approve(controllerAddress, amount).encodeABI(),
    //             'nonce': this.web3.utils.toHex(nonce),
    //         }
    //         return rawTransaction
    //     }

    //     async createAAVETrackingPosition(actionAddr:any, userAddr:any, aTokenAddr:any, positionMax:any, storageKey = "") {
    //         const aavactioncontract = await new this.web3.eth.Contract(actionContract);
    //         const hashinput = [userAddr, aTokenAddr, positionMax, storageKey].toString()
    //         const key = this.sha256(hashinput)
    //         const aavedata = this.web3.eth.abi.encodeParameters(["address", "address", "uint256", "string"], [userAddr, aTokenAddr, positionMax, key]);
    //         const aavecall = aavactioncontract.methods.init(aavedata)
    //         const op = await this.accountApi.createSignedUserOp({
    //             target: actionAddr,
    //             data: aavecall.encodeABI(),
    //         })
    //         return { op, key }
    //     }

    //     async executeAAVETrackingPosition(actionAddr:any, storageKey:any) {
    //         const aavactioncontract = await new this.web3.eth.Contract(actionContract);
    //         const aavedata = this.web3.eth.abi.encodeParameters(["string"], [storageKey]);
    //         const aavecall = aavactioncontract.methods.execute(aavedata)
    //         const op = await this.accountApi.createSignedUserOp({
    //             target: actionAddr,
    //             data: aavecall.encodeABI()
    //         })
    //         return { op }
    //     }
}
