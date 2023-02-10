var assert = require('assert');
const { FunWallet, EoaAaveWithdrawal, AccessControlSchema } = require('../index')
const { DataServer } = require('../utils/DataServer.js')
const { FunWalletConfig } = require('../utils/configs/walletConfigs.js')
const ethers = require('ethers');
const chain = '43113' //avax fuji 
const privKey = '66f37ee92a08eebb5da72886f3c1280d5d1bd5eb8039f52fdb8062df7e364206'
const aTokenAddress = '0x210a3f864812eAF7f89eE7337EAA1FeA1830C57e'
const APIKEY = 'hnHevQR0y394nBprGrvNx4HgoZHUwMet5mXTOBhf'
const prefundAmt = 0
const callData = '0x55cd05cc000000000000000000000000672d9623ee5ec5d864539b326710ec468cfe0abe0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000c409c5eabe00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000406237346266393761383635633965316232343465343233613062643965643962303336356336363635363238383235303830366633343961613865373736343100000000000000000000000000000000000000000000000000000000'
let wallet, aaveActionTx, withdrawEntirePosition;
describe('funWallet integration tests', function () {
  before(async function () {
    const chainInfo = await DataServer.getChainInfo(chain)
    const rpc = chainInfo.rpcdata.rpcurl
    const provider = new ethers.providers.JsonRpcProvider(rpc)

    const eoa = new ethers.Wallet(privKey, provider)
    const schema = new AccessControlSchema()

    const walletConfig = new FunWalletConfig(eoa, chain, APIKEY, prefundAmt)
    wallet = new FunWallet(walletConfig)

    //aave withdraw module
    module = new EoaAaveWithdrawal(aTokenAddress, chain, 10)
    withdrawEntirePosition = wallet.addModule(module)

  })

  describe('withdraw flow', function () {
    it('deployment of fun wallet', async function () {
      const { receipt } = await wallet.deploy()
      if (!receipt.userOpHash || !receipt.txid) {
        assert.equal(true, false, 'Receipt not generated')
      }
    })
    it('get pre execution txs', async function () {
      const modulePreExecTxs = await module.getPreExecTxs(wallet);
      await wallet.deployTxs(modulePreExecTxs)
      const result = await module.verifyRequirements(wallet)
      assert(result, "PreExecTxs Failed")

    })
    it('create action', async function () {
      aaveActionTx = await wallet.createModuleExecutionTx(withdrawEntirePosition)
      const opReceipt=aaveActionTx.data.op
      assert.equal(opReceipt.callGasLimit, 500000)
      assert.equal(opReceipt.callData, callData)
    })
   
    it('deploy userop', async function () {
      const aaveWithdrawalReceipt = await FunWallet.deployTx(aaveActionTx, APIKEY)
      if (!aaveWithdrawalReceipt.userOpHash || !aaveWithdrawalReceipt.txid) {
        done(new Error('Receipt not generated'))
      }
    })
  })
})
