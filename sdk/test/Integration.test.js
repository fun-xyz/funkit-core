// var assert = require('assert');
// const { FunWallet, AAVEWithdrawal, AccessControlSchema } = require('../index')
// const ethers = require('ethers');
// const { doesNotMatch } = require('assert');
// const chain = '43113' //avax fuji 
// const privKey='66f37ee92a08eebb5da72886f3c1280d5d1bd5eb8039f52fdb8062df7e364206'
// const aTokenAddress='0x210a3f864812eAF7f89eE7337EAA1FeA1830C57e'
// const APIKEY='hnHevQR0y394nBprGrvNx4HgoZHUwMet5mXTOBhf'
// const prefundAmt=0.3
// const callData='0x80c5c7d0000000000000000000000000672d9623ee5ec5d864539b326710ec468cfe0abe0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000c409c5eabe00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000406237346266393761383635633965316232343465343233613062643965643962303336356336363635363238383235303830366633343961613865373736343100000000000000000000000000000000000000000000000000000000'
// let wallet,aaveActionTx, withdrawEntirePosition;
// describe('funWallet integration tests', function () {
//   before(async function () {
//     const chainInfo = await FunWallet.getChainInfo(chain)
//     const rpc = chainInfo.rpcdata.rpcurl
//     const provider = new ethers.providers.JsonRpcProvider(rpc)

//     const eoa = new ethers.Wallet(privKey, provider)
//     const schema = new AccessControlSchema()

//     withdrawEntirePosition = schema.addAction(AAVEWithdrawal(aTokenAddress))
//     wallet = new FunWallet(eoa, schema, prefundAmt, chain, APIKEY)

//   })
//   describe('api calls', function(){
//     it('chain-info call', async function () {
//       const chainInfo = await FunWallet.getChainInfo(chain)
//       const rpc = chainInfo.rpcdata.rpcurl
//       // const bundlerUrl = chainInfo.rpcdata.bundlerUrl
//       // const rpcurl = chainInfo.rpcdata.rpcurl
//       // const entryPointAddress = chainInfo.aaData.entryPointAddress
//       // const factoryAddress = chainInfo.aaData.factoryAddress
//       // const AaveActionAddress = chainInfo.actionData.aave  
//       assert.equal(rpc, 'https://avalanche-fuji.infura.io/v3/4a1a0a67f6874be6bb6947a62792dab7')
//     })
//   })
  
//   describe('withdraw flow', function(){
//     it('deployment of fun wallet', async function () {
//       const deployWalletReceipt = await wallet.deploy()
//       if(!deployWalletReceipt.userOpHash || !deployWalletReceipt.txid){
//         done(new Error('Receipt not generated'))
//       }
//     })
//     it('create action', async function(){
//       aaveActionTx = await wallet.createActionTx(withdrawEntirePosition)
//       assert.equal(aaveActionTx.callGasLimit, 500000)
//       assert.equal(aaveActionTx.callData, callData)
//     })
//     it('token approval', async function(){
//       const tokenApprovalReceipt = await wallet.deployTokenApproval(aTokenAddress)
//       assert.equal(tokenApprovalReceipt.from,'0xA596e25E2CbC988867B4Ee7Dc73634329E674d9e')
//     })
//     it('deploy userop', async function(){
//       const aaveWithdrawalReceipt = await FunWallet.deployActionTx(aaveActionTx,APIKEY)
//       if(!aaveWithdrawalReceipt.userOpHash || !aaveWithdrawalReceipt.txid){
//         done(new Error('Receipt not generated'))
//       }
//     })
//   })
// })
