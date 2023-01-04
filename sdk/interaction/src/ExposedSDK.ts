
import { ethers, BigNumber, BigNumberish } from 'ethers'
import { Provider } from '@ethersproject/providers'
import {
  EntryPoint, EntryPoint__factory,
  UserOperationStruct
} from '@account-abstraction/contracts'

import { TransactionDetailsForUserOp } from './TransactionDetailsForUserOp'
import { resolveProperties } from 'ethers/lib/utils'
import { PaymasterAPI } from './PaymasterAPI'
import { getUserOpHash, NotPromise, packUserOp } from '@account-abstraction/utils'
import { calcPreVerificationGas, GasOverheads } from './calcPreVerificationGas'


// const firebase=require('firebase')
// const firebaseConfig = {
//   apiKey: "AIzaSyDidOyxwsM4THzhtCACjApprDh5gXfJJOU",
//   authDomain: "wallet-sdk.firebaseapp.com",
//   projectId: "wallet-sdk",
//   storageBucket: "wallet-sdk.appspot.com",
//   messagingSenderId: "98633293336",
//   appId: "1:98633293336:web:4e460501defaaa7475ad6d",
//   measurementId: "G-VBNQR1DWYY"
// };
// firebase.initializeApp(firebaseConfig);

// const db = firebase.firestore();

// db.collection('immuna-userOps').doc('hashhashashash').set({
//   hello:"dsfsdfdsf"
// })



const Web3 = require('web3')
const Tx = require('ethereumjs-tx').Transaction

const Web3js = new Web3(new Web3.providers.HttpProvider('http://127.0.0.1:8545'))

let tokenAddress = '0xba3D9687Cf50fE253cd2e1cFeEdE1d6787344Ed5' // HST contract address
let toAddress = '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199' // where to send it
let fromAddress = '0x71bE63f3384f5fb98995898A86B02Fb2426c5788' // your wallet
let privateKey = Buffer.from('701b615bbdfb9de65240bc28bd21bbc0d996645a3dd57e7b12bc2bdf6f192c82', 'hex')

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
const Common = require("ethereumjs-common")


let contract = new Web3js.eth.Contract(contractABI, tokenAddress, {from: fromAddress})

// 1e18 === 1 HST
let amount = Web3js.utils.toHex(1e18)
let chainId=Web3js.utils.toHex(31337).toString()

const customCommon = Common.default.forCustomChain(
  'mainnet',
  {
    name : "yourNetwork",
    chainId: chainId,
    networkId : chainId
  },
  "petersburg",
)
console.log(chainId)
Web3js.eth.getTransactionCount(fromAddress)
  .then((count:any) => {
    console.log(count)
    let rawTransaction = {
      'from': fromAddress,
      'gasPrice': Web3js.utils.toHex(20 * 1e9),
      'gasLimit': Web3js.utils.toHex(210000),
      'to': tokenAddress,
      'value': 0x0,
      'data': contract.methods.transfer(toAddress, amount).encodeABI(),
      'nonce': Web3js.utils.toHex(count),
      // 'chainId':chainId
    }
    let transaction = new Tx(rawTransaction, {common:customCommon})
    transaction.sign(privateKey)

    console.log(transaction)
    Web3js.eth.sendSignedTransaction('0x' + transaction.serialize().toString('hex'))
      .on('transactionHash', console.log)

})