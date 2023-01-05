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
  chainId = web3.utils.toHex(31337).toString()
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

const main = async () => {
  const from = '0x71bE63f3384f5fb98995898A86B02Fb2426c5788' //eoa address
  const erc20Addr = "0xba3D9687Cf50fE253cd2e1cFeEdE1d6787344Ed5" //aave interest bearing token
  const unsignedAuthTx = await getUnsignedAuthTx(from, "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199", erc20Addr, 1e18, 'aave')

  let privateKey = Buffer.from('701b615bbdfb9de65240bc28bd21bbc0d996645a3dd57e7b12bc2bdf6f192c82', 'hex')

  const signedAuthTx = await getSignedAuthTx(unsignedAuthTx, privateKey, 31337)
  // console.log(signedAuthTx)
  await deployEthTx(signedAuthTx)
}
main()

export {
  deployEthTx,
  getUnsignedAuthTx,
  getSignedAuthTx,

}