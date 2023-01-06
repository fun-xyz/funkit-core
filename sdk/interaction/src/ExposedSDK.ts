import { UserOperationStruct } from "@account-abstraction/contracts"
import { ethers } from "ethers"
import { FunWallet } from "./FunWallet"

const Common = require("ethereumjs-common")
const Web3 = require('web3')
const Tx = require('ethereumjs-tx').Transaction

const web3 = new Web3(new Web3.providers.HttpProvider('http://127.0.0.1:8545'))

const getUnsignedAuthTx = async (from: string, controllerAddress: string, erc20Addr: string, amount: number, type: string) => {
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
const getSignedAuthTx = (rawTx: any, privateKey: any, chainId: number) => {
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
const deployEthTx = (signedTx: any) => { //forward to rpc

  web3.eth.sendSignedTransaction(signedTx).on('transactionHash', function (txHash: any) {
    console.log(txHash)
  }).on('receipt', function (receipt: any) {
    console.log("receipt:" + receipt);
  })
}

const getSignedUserOp = async (wallet: any, actionAddr: string, type: string) => {
  if (type === 'aave') {
      let { op, key } = await wallet.createAAVETrackingPosition(actionAddr, '0x76ca03a67C049477FfB09694dFeF00416dB69746', '0x39dD11C243Ac4Ac250980FA3AEa016f73C509f37', '10')
      const receipt = await wallet.sendOpToBundler(op)
      await storeUserOp(op, key)
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


const executeUserOp = async (wallet: any, key: string, actionAddr: string) => {
  let { op } = await wallet.executeAAVETrackingPosition(actionAddr, key)
  const receipt = await wallet.sendOpToBundler(op)
  console.log(receipt)
}



const storeUserOp = async (userOp: UserOperationStruct, hash: string) => {
  // const userOp1 = await resolveProperties(userOp)
  // const userOpHash = getUserOpHash(userOp1, entryPointAddress, 5)
  // db.collection('immuna-userOps').doc(hash).set({
  //     userOp
  // }).then(() => {
  //     return true;
  // }).catch(() => {
  //     return false;
  // })
}
const getUserOp = async (userOpHash: string) => {
  // let ref = await db.collection('immuna-userOps').doc(userOpHash)
  // ref.get().then((doc: any) => {
  //     return doc.data()
  // }).catch(() => {
  //     throw new Error('doc not found')
  // })
}






const flow1Test = async () => {
  const from = '0x71bE63f3384f5fb98995898A86B02Fb2426c5788' //eoa address
  const erc20Addr = "0xba3D9687Cf50fE253cd2e1cFeEdE1d6787344Ed5" //aave interest bearing token
  const unsignedAuthTx = await getUnsignedAuthTx(from, "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199", erc20Addr, 1e18, 'aave')

  let privateKey = Buffer.from('701b615bbdfb9de65240bc28bd21bbc0d996645a3dd57e7b12bc2bdf6f192c82', 'hex')

  const signedAuthTx = await getSignedAuthTx(unsignedAuthTx, privateKey, 31337)
  // console.log(signedAuthTx)
  await deployEthTx(signedAuthTx)
  console.log('flow1test complete')
}

const flow2Test = async () => {
  const ownerAccount = new ethers.Wallet("0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356")
  // initialize wallet
  const factoryAddress=""
  const entryPointAddress=""
  const url = "http://localhost:8545"
  const wallet = new FunWallet(url, 'http://localhost:3000/rpc', entryPointAddress, ownerAccount, factoryAddress)
  const address = await wallet.init()
  //fund wallet
  const aaveActionAddr = "0x4026F10CAB74300fC2AF54215532d0b75088FcE2"
  const accs = await web3.eth.getAccounts()
  await web3.eth.sendTransaction({ to: address, from: accs[0], value: web3.utils.toWei("10", "ether") })

  const key = await getSignedUserOp(wallet, aaveActionAddr, 'aave')
  await executeUserOp(wallet, key, '0xsdfsafasdasdfa')
}
const flow3Test=async()=>{

}

flow1Test()
flow2Test()

export {
  deployEthTx,
  getUnsignedAuthTx,
  getSignedAuthTx,


}