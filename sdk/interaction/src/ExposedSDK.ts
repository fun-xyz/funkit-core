
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

const web3 = new Web3(new Web3.providers.HttpProvider('http://127.0.0.1:8545'))

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


let contract = new web3.eth.Contract(contractABI, tokenAddress, {from: fromAddress})

// 1e18 === 1 HST
let amount = web3.utils.toHex(1e18)
let chainId=web3.utils.toHex(31337).toString()

const customCommon = Common.default.forCustomChain(
  'mainnet',
  {
    name : "yourNetwork",
    chainId: chainId,
    networkId : chainId
  },
  "petersburg",
)


// let rawTransaction = {
//   'from': fromAddress,
//   'gasPrice': web3.utils.toHex(20 * 1e9),
//   'gasLimit': web3.utils.toHex(210000),
//   'to': tokenAddress,
//   'value': 0x0,
//   'data': contract.methods.transfer(toAddress, amount).encodeABI(),
//   'nonce': '',
//   // 'chainId':chainId
// }
// console.log(chainId)
// web3.eth.getTransactionCount(fromAddress)
//   .then((count:any) => {
//     console.log(count)
//     rawTransaction.nonce=web3.utils.toHex(count)

//     let transaction = new Tx(rawTransaction, {common:customCommon})
//     transaction.sign(privateKey)

//     console.log(transaction)
//     web3.eth.sendSignedTransaction('0x' + transaction.serialize().toString('hex'))
//       .on('transactionHash', console.log)

// })




const getUnsignedERC20AuthTx = async (from: string, controllerAddress: string, erc20Addr: string, amount: number, type: string) => {
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
      
      
      let myContract = new web3.eth.Contract(contractABI, erc20Addr, {from:from});
      // amount = web3.utils.toHex(amount) 
      let amount = web3.utils.toHex(1e18)

      let nonce = await web3.eth.getTransactionCount(from)
      // let nonce=web3.utils.toHex(9)
      console.log(nonce)
      let rawTransaction = {
          'from': from,
          'gasPrice': web3.utils.toHex(20 * 1e9),
          'gasLimit': web3.utils.toHex(210000),
          'to': erc20Addr,
          'value': 0x0,
          'data': myContract.methods.transfer(controllerAddress, amount).encodeABI(),
          'nonce': web3.utils.toHex(nonce),
          // 'chainId':chainId
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
const getSignedERC20AuthTx = (rawTx: any, privateKey: any, chainId:number) => {
  // chainId=web3.utils.toHex(chainId).toString()
  chainId=web3.utils.toHex(31337).toString()
  const customCommon = Common.default.forCustomChain(
      'mainnet',
      {
        name : "yourNetwork",
        chainId: chainId,
        networkId : chainId
      },
      "petersburg",
    )
  // let transaction = new Tx(rawTx, {common:customCommon})

  const tx = new Tx(rawTx,{common:customCommon})
  tx.sign(privateKey)
  console.log(tx)
  let serializedTx = '0x' + tx.serialize().toString('hex');
  return serializedTx
}
const deployEthTx = (signedTx: any) => { //forward to rpc
  

  web3.eth.sendSignedTransaction(signedTx).on('transactionHash', function (txHash: any) {
      console.log(txHash)
  }).on('receipt', function (receipt: any) {
      console.log("receipt:" + receipt);
  })
}

const main=async ()=>{
  const from = '0x71bE63f3384f5fb98995898A86B02Fb2426c5788' //eoa address
  // const controllerAddr = await api.getAccountAddress() // our controller address
  const erc20Addr = "0xba3D9687Cf50fE253cd2e1cFeEdE1d6787344Ed5" //interest bearing token
  const unsignedAuthTx = await getUnsignedERC20AuthTx(from, "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199", erc20Addr, 1e18, 'aave')
  // const authTxSignature = Buffer.from(
  //     'ea6c44ac03bff858b476bba40716402b03e41b8e97e276d1baec7c37d42484a0',
  //     'hex',
  //   ) // get from user
    let privateKey = Buffer.from('701b615bbdfb9de65240bc28bd21bbc0d996645a3dd57e7b12bc2bdf6f192c82', 'hex')
  
  const signedAuthTx = await getSignedERC20AuthTx(unsignedAuthTx, privateKey,31337)
  // console.log(signedAuthTx)
  await deployEthTx(signedAuthTx)
}

main()