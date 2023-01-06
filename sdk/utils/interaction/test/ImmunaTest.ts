// import {
//     EntryPoint,
//     EntryPoint__factory,
//     SimpleAccountDeployer__factory,
//     UserOperationStruct
// } from '@account-abstraction/contracts'
// import { BigNumber, Wallet } from 'ethers'
// import { getAddress, parseEther, resolveProperties } from 'ethers/lib/utils'
// import { expect } from 'chai'
// const { ethers } = require("hardhat");
// import { SampleRecipient, SampleRecipient__factory } from '@account-abstraction/utils/dist/src/types'
// import { DeterministicDeployer } from '../src/DeterministicDeployer'
// import { HttpRpcClient, SimpleAccountAPI, wrapProvider } from '../src'
// import { getUserOpHash, rethrowError } from '@account-abstraction/utils'
// import { isCallTrace } from 'hardhat/internal/hardhat-network/stack-traces/message-trace'
// const { TreasuryFactory__factory } = require("../../hardcode/treasuryfactory")
// const treasuryAbi = require("../../../web3/build/contracts/Treasury.json").abi
// const firebase = require('firebase')
// import { TreasuryAPI } from '../src/TreasuryAPI'
// import { BaseAccountAPI } from '../src/BaseAccountAPI'
// import { FunWallet } from '../src/FunWallet'
// const firebaseConfig = {
//     apiKey: "AIzaSyDidOyxwsM4THzhtCACjApprDh5gXfJJOU",
//     authDomain: "wallet-sdk.firebaseapp.com",
//     projectId: "wallet-sdk",
//     storageBucket: "wallet-sdk.appspot.com",
//     messagingSenderId: "98633293336",
//     appId: "1:98633293336:web:4e460501defaaa7475ad6d",
//     measurementId: "G-VBNQR1DWYY"
// };
// firebase.initializeApp(firebaseConfig);

// const db = firebase.firestore();


// let owner: Wallet
// let entryPoint: EntryPoint
// let beneficiary: string
// let recipient: SampleRecipient
// let accountAddress: string
// let accountDeployed = false
// let api: SimpleAccountAPI
// const Web3 = require('web3')


// var Tx = require('ethereumjs-tx').Transaction;
// let config: any

// const Common = require("ethereumjs-common")
// const entryPointAddress = "0x2DF1592238420ecFe7f2431360e224707e77fA0E" //get from hardhat-deploy
// const factoryAddress = "0x959922bE3CAee4b8Cd9a407cc3ac1C251C2007B1" //get from deployjs
// const bundlerURL = 'http://localhost:3000/rpc'
// let rpcURL = 'http://127.0.0.1:8545'
// let web3 = new Web3(new Web3.providers.HttpProvider(rpcURL));
// const provider = new ethers.providers.JsonRpcProvider(rpcURL);
// const signer = provider.getSigner()
// let amountToSend = parseEther('.1')


// const main = async () => {


//     config = {
//         entryPointAddress: entryPointAddress,
//         bundlerUrl: bundlerURL
//     }

//     entryPoint = await new EntryPoint__factory(signer).deploy()
//     beneficiary = await signer.getAddress()

//     recipient = await new SampleRecipient__factory(signer).deploy()
//     owner = Wallet.createRandom()
//     // const factoryAddress = await DeterministicDeployer.deploy(SimpleAccountDeployer__factory.bytecode)
//     const ownerAccount = new ethers.Wallet("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80")


//     const erc4337Provider = await wrapProvider(
//         provider,
//         // new JsonRpcProvider('http://localhost:8545/'),
//         config,
//         ownerAccount
//     )

//     const erc4337Signer = erc4337Provider.getSigner();
//     const simpleAccountPhantomAddress = await erc4337Signer.getAddress()


//     api = new TreasuryAPI({
//         provider: erc4337Provider,
//         entryPointAddress: config.entryPointAddress,
//         owner: ownerAccount,
//         factoryAddress
//     })




//     const getUnsignedAuthTx = async (from: string, controllerAddress: string, erc20Addr: string, amount: number, type: string) => {
//         if (type === 'aave') {
//             let contractABI = [
//                 // transfer
//                 {
//                     'constant': false,
//                     'inputs': [
//                         {
//                             'name': '_to',
//                             'type': 'address'
//                         },
//                         {
//                             'name': '_value',
//                             'type': 'uint256'
//                         }
//                     ],
//                     'name': 'transfer',
//                     'outputs': [
//                         {
//                             'name': '',
//                             'type': 'bool'
//                         }
//                     ],
//                     'type': 'function'
//                 }
//             ]


//             let myContract = new web3.eth.Contract(contractABI, erc20Addr, { from: from });
//             amount = web3.utils.toHex(amount)

//             let nonce = await web3.eth.getTransactionCount(from)
//             // let nonce=web3.utils.toHex(9)
//             // console.log(nonce)
//             let rawTransaction = {
//                 'from': from,
//                 'gasPrice': web3.utils.toHex(20 * 1e9),
//                 'gasLimit': web3.utils.toHex(210000),
//                 'to': erc20Addr,
//                 'value': 0x0,
//                 'data': myContract.methods.transfer(controllerAddress, amount).encodeABI(),
//                 'nonce': web3.utils.toHex(nonce),
//                 // 'chainId':chainId
//             }


//             return rawTransaction
//         }
//         else if (type === 'uniswap') {

//         }
//         else {
//             throw new Error('unsupported token')
//             return {}
//         }

//     }
//     const getSignedAuthTx = (rawTx: any, privateKey: any, chainId: number) => {
//         // chainId=web3.utils.toHex(chainId).toString()
//         chainId = web3.utils.toHex(31337).toString()
//         const customCommon = Common.default.forCustomChain(
//             'mainnet',
//             {
//                 name: "yourNetwork",
//                 chainId: chainId,
//                 networkId: chainId
//             },
//             "petersburg",
//         )
//         // let transaction = new Tx(rawTx, {common:customCommon})

//         const tx = new Tx(rawTx, { common: customCommon })
//         tx.sign(privateKey)
//         // console.log(tx)
//         let serializedTx = '0x' + tx.serialize().toString('hex');
//         return serializedTx
//     }
//     const deployEthTx = async (signedTx: any) => { //forward to rpc
//         web3.eth.sendSignedTransaction(signedTx).on('transactionHash', function (txHash: any) {
//             console.log(txHash)
//         })
//     }



//     const getSignedUserOp = async (wallet: any, actionAddr: string, type: string) => {
//         if (type === 'aave') {
//             let { op, key } = await wallet.createAAVETrackingPosition(actionAddr, '0x76ca03a67C049477FfB09694dFeF00416dB69746', '0x39dD11C243Ac4Ac250980FA3AEa016f73C509f37', '10')
//             const receipt = await wallet.sendOpToBundler(op)
//             await storeUserOp(op, key)
//             return key
//         }
//         else if (type === 'uniswap') {

//             return ''
//         }
//         else {
//             throw new Error(`${type} of wallet is not available`)
//             return null
//         }
//     }

//     const executeUserOp = async (wallet: any, key: string, actionAddr: string) => {
//         let { op } = await wallet.executeAAVETrackingPosition(actionAddr, key)
//         const receipt = await wallet.sendOpToBundler(op)
//         console.log(receipt)
//     }

//     // const getUnsignedUserOp=async (api:BaseAccountAPI, type:string, amount: BigNumber)=>{
//     //     let { op, key } = await wallet.createAAVETrackingPosition(aaveActionAddr, '0x76ca03a67C049477FfB09694dFeF00416dB69746', '0x39dD11C243Ac4Ac250980FA3AEa016f73C509f37', '10')
//     //     const receipt = await wallet.sendOpToBundler(op)
//     //     return key;
//     // }
//     // const getUnsignedUserOp = async (api: BaseAccountAPI, type: string, amount: BigNumber, providerURL: string) => {
//     //     let op = await api.getUnsignedUserOp(
//     //         'aave',
//     //         amount,
//     //         rpcURL
//     //     )

//     //     return op
//     // }
//     // const getSignedUserOp = async (api: BaseAccountAPI, unsignedUserOp: UserOperationStruct, signature: string) => {


//     //     let op = await api.getSignedUserOp(unsignedUserOp, signature)
//     //     return op
//     // }

//     // const executeUserOp = async (userOp: UserOperationStruct) => {

//     //     const EntryPointFactory = await ethers.getContractFactory('EntryPoint')
//     //     const entryPoint = await EntryPointFactory.deploy()
//     //     const config = {
//     //         entryPointAddress: entryPoint.address,
//     //         bundlerUrl: bundlerURL
//     //     }
//     //     const ownerAccount = Wallet.createRandom()

//     //     const erc4337Provider = await wrapProvider(
//     //         ethers.provider,
//     //         // new JsonRpcProvider('http://localhost:8545/'),
//     //         config,
//     //         ownerAccount
//     //     )

//     //     const net = await erc4337Provider.getNetwork()

//     //     const rpcClient = new HttpRpcClient(config.bundlerUrl, config.entryPointAddress, net.chainId)

//     //     try {

//     //         const userOpHash = await rpcClient.sendUserOpToBundler(userOp)
//     //         return true
//     //         // console.log('reqId', userOpHash, 'txid=', txid)
//     //     } catch (e: any) {
//     //         console.log(e)
//     //         return false
//     //     }
//     // }

//     const deployWallet = async (wallet: UserOperationStruct) => {
//         const EntryPointFactory = await ethers.getContractFactory('EntryPoint')
//         const entryPoint = await EntryPointFactory.deploy()

//         const ownerAccount = Wallet.createRandom()

//         const erc4337Provider = await wrapProvider(
//             ethers.provider,
//             // new JsonRpcProvider('http://localhost:8545/'),
//             config,
//             ownerAccount
//         )

//         const net = await erc4337Provider.getNetwork()

//         const rpcClient = new HttpRpcClient(config.bundlerUrl, config.entryPointAddress, net.chainId)

//         try {
//             const userOpHash = await rpcClient.sendUserOpToBundler(wallet)
//             return true
//             // console.log('reqId', userOpHash, 'txid=', txid)
//         } catch (e: any) {
//             console.log(e)
//             return false
//         }
//     }
//     const getWalletSpec = async (type: string) => {
//         const ownerAccount = new ethers.Wallet("0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356")
//         let accountOwner = new Wallet("0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356")
//         const factoryAddress = "0x9323d71E54CFFE145Ae15Ad711a5aD52255A7866"

//         let amount = parseEther('1') // amount
//         const accs = await web3.eth.getAccounts()

//         const erc4337Provider = await wrapProvider(
//             provider,
//             config,
//             ownerAccount
//         )
//         const erc4337Signer = erc4337Provider.getSigner();

//         const accountApi = new TreasuryAPI({
//             provider: erc4337Provider,
//             entryPointAddress: config.entryPointAddress,  //check this
//             owner: accountOwner,
//             factoryAddress
//         })
//         let addr = accountApi.getAddressFromType(type)

//         const accountAddress = await accountApi.getAccountAddress()


//         await web3.eth.sendTransaction({ to: accountAddress, from: accs[0], value: web3.utils.toWei("10", "ether") })

//         const aaveActionAddr = "0x76ca03a67C049477FfB09694dFeF00416dB69746"

//         const aavedata = web3.eth.abi.encodeParameters(["address", "address", "uint256", "string"], ['0x76ca03a67C049477FfB09694dFeF00416dB69746', '0x39dD11C243Ac4Ac250980FA3AEa016f73C509f37', '10', 'key1']);
//         const aavecall = web3.eth.abi.encodeFunctionCall({
//             "inputs": [
//                 {
//                     "internalType": "bytes",
//                     "name": "data",
//                     "type": "bytes"
//                 }
//             ],
//             "name": "init",
//             "outputs": [
//                 {
//                     "internalType": "bytes",
//                     "name": "",
//                     "type": "bytes"
//                 }
//             ],
//             "stateMutability": "payable",
//             "type": "function"
//         }, [aavedata])

//         const recipient = new ethers.Contract("0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266", treasuryAbi, erc4337Signer)



//         const op: UserOperationStruct = await accountApi.createSignedUserOp({
//             target: recipient.address,
//             data: recipient.interface.encodeFunctionData('callOp', [aaveActionAddr, 0, aavecall]),

//         })
//         op.initCode = "1"
//         return op;
//     }
    
//     const storeUserOp = async (userOp: UserOperationStruct, hash: string) => {
//         const userOp1 = await resolveProperties(userOp)
//         // const userOpHash = getUserOpHash(userOp1, entryPointAddress, 5)
//         db.collection('immuna-userOps').doc(hash).set({
//             userOp
//         }).then(() => {
//             return true;
//         }).catch(() => {
//             return false;
//         })
//     }
//     const getUserOp = async (userOpHash: string) => {
//         let ref = await db.collection('immuna-userOps').doc(userOpHash)
//         ref.get().then((doc: any) => {
//             return doc.data()
//         }).catch(() => {
//             throw new Error('doc not found')
//         })
//     }
//     const from = '0x71bE63f3384f5fb98995898A86B02Fb2426c5788' //eoa address
//     const controllerAddr = await api.getAccountAddress() // our controller address
//     const erc20Addr = "0xba3D9687Cf50fE253cd2e1cFeEdE1d6787344Ed5" //interest bearing token
//     // const unsignedAuthTx = await getUnsignedAuthTx(from, controllerAddr, erc20Addr, 1e18, 'aave')
//     // console.log(controllerAddr)
//     // const authTxSignature = Buffer.from(
//     //     'ea6c44ac03bff858b476bba40716402b03e41b8e97e276d1baec7c37d42484a0',
//     //     'hex',
//     //   ) // get from user
//     // let privateKey = Buffer.from('701b615bbdfb9de65240bc28bd21bbc0d996645a3dd57e7b12bc2bdf6f192c82', 'hex')

//     // const signedAuthTx = await getSignedAuthTx(unsignedAuthTx, privateKey, 31337)
//     // await deployEthTx(signedAuthTx)

//     // const unsignedUserOp = await getUnsignedUserOp(api,
//     //     'aave',
//     //     amountToSend,
//     //     rpcURL
//     // )
//     // const userOpSignature = "." // TODO
//     // const signedUserOp = await getSignedUserOp(api, unsignedUserOp, 'aave')
//     // storeUserOp(signedUserOp)
//     // executeUserOp(signedUserOp)
//     // const walletSpec = await getWalletSpec("Aave")
//     // deployWallet(walletSpec)
//     const test = async () => {
//         const ownerAccount = new ethers.Wallet("0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356")
//         // initialize wallet

//         const url = "http://localhost:8545"
//         const wallet = new FunWallet(url, 'http://localhost:3000/rpc', entryPointAddress, ownerAccount, factoryAddress)
//         const address = await wallet.init()
//         //fund wallet
//         const aaveActionAddr = "0x4026F10CAB74300fC2AF54215532d0b75088FcE2"
//         const accs = await web3.eth.getAccounts()
//         await web3.eth.sendTransaction({ to: address, from: accs[0], value: web3.utils.toWei("10", "ether") })

//         const key = await getSignedUserOp(wallet, aaveActionAddr, 'aave')
//         await executeUserOp(wallet, key, '0xsdfsafasdasdfa')
//     }
//     test()


// }













// // const getWalletSpec = async (type: string): Promise<UserOperationStruct> => {

// //     entryPoint = await new EntryPoint__factory(signer).deploy()
// //     beneficiary = await signer.getAddress()

// //     recipient = await new SampleRecipient__factory(signer).deploy()
// //     owner = Wallet.createRandom()
// //     const factoryAddress = await DeterministicDeployer.deploy(TreasuryFactory__factory.bytecode)
// //     //create userop
// //     let wallet:any;
// //     if (type === 'aave' || type==='uniswap') {
// //         wallet=new TreasuryAPI({
// //             provider,
// //         entryPointAddress: entryPoint.address,
// //         owner,
// //         factoryAddress
// //         })
// //     }
// //     else {
// //         throw new Error(`${type} of wallet is not available`)
// //         return null
// //     }

// //     const unsignedUserOp = await wallet.encode({
// //         type,
// //         amountToSend,
// //         'http://127.0.0.1:8545'
// //     })
// //     return unsignedUserOp

// // }


// // it('test', async () => {
// // const contractAbi: any[] = []
// // const controllerAddr = "0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff" // oour controller address
// // const erc20Addr = "0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff" // address of their token
// // const authTxSignature = "." // TODO
// // const signedAuthTx = getSignedERC20AuthTx(unsignedAuthTx, authTxSignature)
// // const providerURL = ""

// // const unsignedUserOp = await api.getUnsignedUserOp(
// //     'aave',
// //     amountToSend,
// //     'http://127.0.0.1:8545'
// // )
// // notifyBundlerOfEvent(userOpSignature)
// // })

// main()