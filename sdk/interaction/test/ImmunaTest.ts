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
import { SampleRecipient, SampleRecipient__factory } from '@account-abstraction/utils/dist/src/types'
import { DeterministicDeployer } from '../src/DeterministicDeployer'
import { HttpRpcClient, SimpleAccountAPI, wrapProvider } from '../src'
import { rethrowError } from '@account-abstraction/utils'
import { isCallTrace } from 'hardhat/internal/hardhat-network/stack-traces/message-trace'
import { AaveAccountAPI } from '../src/AaveAccountAPI'
const { TreasuryFactory__factory } = require("../../hardcode/treasuryfactory")
const treasuryAbi = require("../../web3/build/contracts/Treasury.json").abi

import { TreasuryAPI } from '../src/TreasuryAPI'

const url = "http://localhost:8545"
const provider =  new ethers.providers.JsonRpcProvider(url);
const signer = provider.getSigner()

let owner: Wallet
let entryPoint: EntryPoint
let beneficiary: string
let recipient: SampleRecipient
let accountAddress: string
let accountDeployed = false
let api: SimpleAccountAPI
let web3: any
var Tx = require('ethereumjs-tx').Transaction;
let config:any

describe('Immuna Test', () => {

    before('init', async () => {


        config = {
            entryPointAddress: entryPoint.address,
            bundlerUrl: 'http://localhost:3000/rpc'
        }

        entryPoint = await new EntryPoint__factory(signer).deploy()
        beneficiary = await signer.getAddress()

        recipient = await new SampleRecipient__factory(signer).deploy()
        owner = Wallet.createRandom()
        const factoryAddress = await DeterministicDeployer.deploy(SimpleAccountDeployer__factory.bytecode)


        api = new SimpleAccountAPI({
            provider,
            entryPointAddress: entryPoint.address,
            owner,
            factoryAddress
        })

        const Web3 = require('web3')
        web3 = new Web3(new Web3.providers.HttpProvider('http://127.0.0.1:8545'));


    })

    const getUnsignedERC20AuthTx = (controllerAddress: any, erc20Addr: any, amount: any, abiArray: any[]) => {
        let myContract = new web3.eth.Contract(abiArray, erc20Addr);
        let data = myContract.methods.transfer(controllerAddress, amount).encodeABI();

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
        return serializedTx
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
            return true
            // console.log('reqId', userOpHash, 'txid=', txid)
        } catch (e: any) {
            console.log(e)
            return false
        }
    }
    // const getWalletSpec = async (type: string): Promise<UserOperationStruct> => {
        
    //     entryPoint = await new EntryPoint__factory(signer).deploy()
    //     beneficiary = await signer.getAddress()

    //     recipient = await new SampleRecipient__factory(signer).deploy()
    //     owner = Wallet.createRandom()
    //     const factoryAddress = await DeterministicDeployer.deploy(TreasuryFactory__factory.bytecode)
    //     //create userop
    //     let wallet:any;
    //     if (type === 'aave' || type==='uniswap') {
    //         wallet=new TreasuryAPI({
    //             provider,
    //         entryPointAddress: entryPoint.address,
    //         owner,
    //         factoryAddress
    //         })
    //     }
    //     else {
    //         throw new Error(`${type} of wallet is not available`)
    //         return null
    //     }

    //     const unsignedUserOp = await wallet.encode({
    //         type,
    //         amountToSend,
    //         'http://127.0.0.1:8545'
    //     })
    //     return unsignedUserOp

    // }
    const deployWallet = async (wallet: UserOperationStruct) => {
        const EntryPointFactory = await ethers.getContractFactory('EntryPoint')
        const entryPoint = await EntryPointFactory.deploy()
        
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
            const userOpHash = await rpcClient.sendUserOpToBundler(wallet)
            return true
            // console.log('reqId', userOpHash, 'txid=', txid)
        } catch (e: any) {
            console.log(e)
            return false
        }
    }
    const getWalletSpec=async(type:string)=>{
        const entryPointAddress = "0x1306b01bC3e4AD202612D3843387e94737673F53"
        const ownerAccount = new ethers.Wallet("0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356")
        let accountOwner = new Wallet("0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356")
        const factoryAddress = "0x9323d71E54CFFE145Ae15Ad711a5aD52255A7866"

        let amount = parseEther('1') // amount
        const accs = await web3.eth.getAccounts()
        
        const erc4337Provider = await wrapProvider(
            provider,
            // new JsonRpcProvider('http://localhost:8545/'),
            config,
            ownerAccount
        )
        const erc4337Signer = erc4337Provider.getSigner();

        const accountApi = new TreasuryAPI({
            provider: erc4337Provider,
            entryPointAddress: config.entryPointAddress,  //check this
            owner: accountOwner,
            factoryAddress
        })
        let addr = accountApi.getAddressFromType(type)

        const accountAddress = await accountApi.getAccountAddress()
    
    
        await web3.eth.sendTransaction({ to: accountAddress, from: accs[0], value: web3.utils.toWei("10", "ether") })
    
        // let contract = new web3.eth.Contract(simpleAccountABI);  //get from simpleaccount
        // let data = contract.methods.transfer(addr, amount).encodeABI();
    
        //   function transfer(address payable dest, uint256 amount) external onlyOwner {
        //     dest.transfer(amount);
        // }
        const aaveActionAddr = "0x76ca03a67C049477FfB09694dFeF00416dB69746"
    
        const aavedata = web3.eth.abi.encodeParameters(["address", "address", "uint256", "string"], ['0x76ca03a67C049477FfB09694dFeF00416dB69746', '0x39dD11C243Ac4Ac250980FA3AEa016f73C509f37', '10', 'key1']);
        const aavecall = web3.eth.abi.encodeFunctionCall({
            "inputs": [
                {
                    "internalType": "bytes",
                    "name": "data",
                    "type": "bytes"
                }
            ],
            "name": "init",
            "outputs": [
                {
                    "internalType": "bytes",
                    "name": "",
                    "type": "bytes"
                }
            ],
            "stateMutability": "payable",
            "type": "function"
        }, [aavedata])
    
        const recipient = new ethers.Contract("0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266", treasuryAbi, erc4337Signer)
    
        
        
        const op:UserOperationStruct = await accountApi.createSignedUserOp({
            target: recipient.address,
            data: recipient.interface.encodeFunctionData('callOp', [aaveActionAddr, 0, aavecall]),
            
        })
        op.initCode="1"
        return op;
    
    }



    it('test', async () => {

        const contractAbi: any[] = []
        const controllerAddr = "0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff" // oour controller address
        const erc20Addr = "0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff" // address of their token
        const unsignedAuthTx = getUnsignedERC20AuthTx(controllerAddr, erc20Addr, 10.0, contractAbi)
        const authTxSignature = "." // TODO
        const signedAuthTx = getSignedERC20AuthTx(unsignedAuthTx, authTxSignature)
        let amountToSend = parseEther('.01')
        const providerURL = ""
        
        const unsignedUserOp = await api.getUnsignedUserOp(
            'aave',
            amountToSend,
            'http://127.0.0.1:8545'
        )

        const userOpSignature = "." // TODO
        const signedUserOp = api.getSignedUserOp(unsignedUserOp, userOpSignature)



        const walletSpec = await getWalletSpec("Aave")
        deployEthTx(signedAuthTx)
        deployWallet(walletSpec)
        deployUserOp(signedUserOp, api)
        notifyBundlerOfEvent(userOpSignature)
    })


})
