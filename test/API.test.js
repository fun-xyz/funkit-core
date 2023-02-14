

const chain = '43113' //avax fuji 
const { DataServer } = require('../utils/DataServer.js')
var assert = require('assert');
const apiKey = 'hnHevQR0y394nBprGrvNx4HgoZHUwMet5mXTOBhf'
let translationServer
let hash

const receipt = {
    blockHash: "0x0acaa562c336d7373d4d1ed9d361c07168a7083220486f6282b786ef51bfed21",
    blockNumber: 18190919,
    byzantium: true,
    confirmations: 1,
    contractAddress: null,
    cumulativeGasUsed: {
        hex: "0x8674",
        type: "BigNumber"
    },
    effectiveGasPrice: {
        hex: "0x05d21dba00",
        type: "BigNumber"
    },
    from: "0xD3c2162DbDB1eCE941e7B06d0d9F78A95eCe004E",
    gasUsed: {
        hex: "0x8674",
        type: "BigNumber"
    },
    logs: [
        {
            address: "0x7021eB315AD2Ce787E3A6FD1c4a136c9722457Cc",
            blockHash: "0x0acaa562c336d7373d4d1ed9d361c07168a7083220486f6282b786ef51bfed21",
            blockNumber: 18190919,
            data: "0x000fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
            logIndex: 0,
            topics: [
                "0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925",
                "0x000000000000000000000000d3c2162dbdb1ece941e7b06d0d9f78a95ece004e",
                "0x000000000000000000000000744b4b78d53ec0db70d27b240645f015c69952b1"
            ],
            transactionHash: "0x3c9a4e7fc0ffd2a0a91c4cc8e0f762160b7e5ebd8d9a95c3c070aaebc84feb39",
            transactionIndex: 0
        }
    ],
    logsBloom: "0x00000000000000000000000000000000000000000000000000000000000040000080000000000000000000000000000000010000000000000000000010200000000010000000000000000000000000000000000000000000000000000000000000000000000000000000010000000000200000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000020000000010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000200010000000000000000000000000000000000000000000000000000000000000",
    status: 1,
    to: "0x7021eB315AD2Ce787E3A6FD1c4a136c9722457Cc",
    transactionHash: "0x3c9a4e7fc0ffd2a0a91c4cc8e0f762160b7e5ebd8d9a95c3c070aaebc84feb39",
    transactionIndex: 0,
    type: 0
}
const op = {
    balance: [
      {
        hex: "0x16ce3f1e16bf1f5d13",
        type: "BigNumber"
      }
    ],
    callData: "0x80c5c7d0000000000000000000000000744b4b78d53ec0db70d27b240645f015c69952b1000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000204d0cb75fa000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000001000000000000000000000000672d9623ee5ec5d864539b326710ec468cfe0abe0000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000001044ddf47d4000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000c0000000000000000000000000d3c2162dbdb1ece941e7b06d0d9f78a95ece004e0000000000000000000000007021eb315ad2ce787e3a6fd1c4a136c9722457cc00000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000040343761316466313865663664633933373839626631386238326336306334313239396166656331376261333764633465353361623936653135653637376163370000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
    callGasLimit: 560000,
    initCode: "0x",
    maxFeePerGas: {
      hex: "0x0bfda3a300",
      type: "BigNumber"
    },
    maxPriorityFeePerGas: {
      hex: "0x59682f00",
      type: "BigNumber"
    },
    nonce: {
      hex: "0x2911ce67",
      type: "BigNumber"
    },
    paymasterAndData: "0x",
    preVerificationGas: 52948,
    sender: "0x744B4b78d53eC0DB70D27B240645f015C69952B1",
    signature: "0x5eac7999dc1cde7a3b4e0167f589a367ac8cf5487a4b6f7d0259e74baef807b936b84442a668b5dafcc37b5e7d213db86e564d2587b763e0a7ada62cf4398ccb1c",
    type: "deploy_wallet",
    verificationGasLimit: {
      hex: "0x4c4b40",
      type: "BigNumber"
    }
  }
describe('api calls', function () {
    before('', async function () {
        dataServer = new DataServer(apiKey, 'fun-dev')
    })
    it('chain-info call', async function () {
        const chainInfo = await DataServer.getChainInfo(chain)
        const rpc = chainInfo.rpcdata.rpcurl
        // const bundlerUrl = chainInfo.rpcdata.bundlerUrl
        // const rpcurl = chainInfo.rpcdata.rpcurl
        // const entryPointAddress = chainInfo.aaData.entryPointAddress
        // const factoryAddress = chainInfo.aaData.factoryAddress
        // const AaveActionAddress = chainInfo.actionData.aave  
        assert.equal(rpc, 'https://avalanche-fuji.infura.io/v3/4a1a0a67f6874be6bb6947a62792dab7')
    })
    it('store-user-op call', async function(){
        hash=await dataServer.storeUserOp(op,'test-op',69)
        assert.equal(hash,'1b5d7ddae7272509e46db8975e72185cfc4f2f58372fcb96bb4de4857c783050')
    })
    it('store-evm-receipt call', async function () {
        const response = await dataServer.storeEVMCall(receipt)
        assert.equal(response.success, true)
    })
    it('get-user-op call', async function () {
        const retOp = await dataServer.getStoredUserOp(hash)        
        assert.equal(typeof retOp, 'object')
        assert.equal(retOp[0].signature,'0x5eac7999dc1cde7a3b4e0167f589a367ac8cf5487a4b6f7d0259e74baef807b936b84442a668b5dafcc37b5e7d213db86e564d2587b763e0a7ada62cf4398ccb1c')
    })

})