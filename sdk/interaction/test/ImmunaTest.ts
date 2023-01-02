import {
    EntryPoint,
    EntryPoint__factory,
    SimpleAccountDeployer__factory,
    UserOperationStruct
} from '@account-abstraction/contracts'
import { Wallet } from 'ethers'
import { parseEther } from 'ethers/lib/utils'
import { expect } from 'chai'
import { anyValue } from '@nomicfoundation/hardhat-chai-matchers/withArgs'
import { ethers } from 'hardhat'
import { AccountAbstractionAPI } from '../src/SimpleAccountAPI'
import { SampleRecipient, SampleRecipient__factory } from '@account-abstraction/utils/dist/src/types'
import { DeterministicDeployer } from '../src/DeterministicDeployer'
import { HttpRpcClient, SimpleAccountAPI, wrapProvider } from '../src'
import { rethrowError } from '@account-abstraction/utils'
import { isCallTrace } from 'hardhat/internal/hardhat-network/stack-traces/message-trace'
const provider = ethers.provider
const signer = provider.getSigner()

let owner: Wallet
let entryPoint: EntryPoint
let beneficiary: string
let recipient: SampleRecipient
let accountAddress: string
let accountDeployed = false


describe('Immuna Test', ()=>{

    before('init',async ()=>{




    entryPoint = await new EntryPoint__factory(signer).deploy()
    beneficiary = await signer.getAddress()

    recipient = await new SampleRecipient__factory(signer).deploy()
    owner = Wallet.createRandom()
    const factoryAddress = await DeterministicDeployer.deploy(SimpleAccountDeployer__factory.bytecode)


    const api = new SimpleAccountAPI({
        provider,
        entryPointAddress: entryPoint.address,
        owner,
        factoryAddress
    })

    const Web3 = require('web3')
    const web3 = new Web3(new Web3.providers.HttpProvider('http://127.0.0.1:8545'));
    var Tx = require('ethereumjs-tx').Transaction;





    const getUnsignedERC20AuthTx = (controllerAddress: any, erc20Addr: any, quantity: any, abiArray: any[]) => {
        let myContract = new web3.eth.Contract(abiArray, erc20Addr);
        let data = myContract.methods.transfer(controllerAddress, quantity).encodeABI();

        let rawTx = {
            "nonce": web3.utils.toHex(0x00), //change at will
            "gasPrice": "0x09184e72a000", //change at will
            "gasLimit": "0x2710", //change at will
            "to": erc20Addr,
            "value": 0,
            "data": data,
        }
        return rawTx
    }
    const getSignedERC20AuthTx = (rawTx: any, privateKey: any) => {
        const tx = new Tx(rawTx)
        tx.sign(privateKey)
        let serializedTx = "0x" + tx.serialize().toString('hex');
    }
    const deployEthTx = (signedTx: any) => { //forward to rpclo
        web3.eth.sendSignedTransaction(signedTx).on('transactionHash', function (txHash: any) {

        }).on('receipt', function (receipt: any) {
            console.log("receipt:" + receipt);
        })
    }
    const deployUserOp = async (userOp: UserOperationStruct, accountApi: SimpleAccountAPI) => {
        const EntryPointFactory = await ethers.getContractFactory('EntryPoint')
        const entryPoint = await EntryPointFactory.deploy()
        const config = {
            entryPointAddress: entryPoint.address,
            bundlerUrl: 'http://localhost:3000/rpc'
        }
        const ownerAccount = Wallet.createRandom()

        const erc4337Provider = await wrapProvider(
            ethers.provider,
            // new JsonRpcProvider('http://localhost:8545/'),
            config,
            ownerAccount
        )

        const net = await erc4337Provider.getNetwork()

        const rpcClient = new HttpRpcClient(config.bundlerUrl, config.entryPointAddress, net.chainId)

        try {

            const userOpHash = await rpcClient.sendUserOpToBundler(userOp)
            const txid = await accountApi.getUserOpReceipt(userOpHash)
            // console.log('reqId', userOpHash, 'txid=', txid)
        } catch (e: any) {
            console.log(e)
        }
    }


    })
    





    it('test', async ()=>{

    })



    const userOpHash = await rpcClient.sendUserOpToBundler(userOp)
    const txid = await api.getUserOpReceipt(userOpHash)



    const contractAbi:any[]=[]
    const controllerAddr = "0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff" // oour controller address
    const erc20Addr = "0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff" // address of their token
    const unsignedAuthTx = getUnsignedERC20AuthTx(controllerAddr, erc20Addr, 10.0,contractAbi)
    const authTxSignature = "." // TODO
    const signedAuthTx = getSignedERC20AuthTx(unsignedAuthTx, authTxSignature)
    let amountToSend = parseEther('.01')
    const providerURL = ""
    const unsignedUserOp = await api.getUnsignedUserOp(
        erc20Addr,
        amountToSend,
        'http://127.0.0.1:8545'
    )

    const userOpSignature = "." // TODO
    const signedUserOp = api.getSignedUserOp(unsignedUserOp, userOpSignature)



    const walletSpec = getWalletSpec("Aave")
    deployEthTx(signedAuthTx)
    deployWallet(walletSpec)
    deployUserOp(signedUserOp,api)
    notifyBundlerOfEvent(userOpSignature)
})
