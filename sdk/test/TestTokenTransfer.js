const { FunWallet, TransferToken, AccessControlSchema } = require("../index")
const ethers = require('ethers')
const { TestAaveConfig, FunWalletConfig } = require("../utils/configs/walletConfigs")
const chain = '43113' //avax fuji 
const { DataServer } = require('../utils/DataServer')

const { getUserBalanceErc } = require("../utils/deploy")

const main = async (config, rpcurl) => {
    if (!rpcurl) {
        const chainInfo = await DataServer.getChainInfo(chain)
        rpcurl = chainInfo.rpcdata.rpcurl //https://avalanche-fuji.infura.io/v3/4a1a0a67f6874be6bb6947a62792dab7
    }

    const provider = new ethers.providers.JsonRpcProvider(rpcurl)
    const eoa = new ethers.Wallet(config.privKey, provider)


    const to = '0xA596e25E2CbC988867B4Ee7Dc73634329E674d9e'
    const amount = 10000
    const tokenName = "cvt"



    const walletConfig = new FunWalletConfig(eoa, config.prefundAmt, chain, config.APIKEY)
    const wallet = new FunWallet(walletConfig)
    await wallet.init()

    const transfer = new TransferToken() //0x5425890298aed601595a70AB815c96711a31Bc65 1000000=1usdc
    await wallet.addModule(transfer)
    await wallet.deploy()

    const transferActionTx = await transfer.createTransfer(to, amount, tokenName)
    await wallet.deployTx(transferActionTx)
}

const processConsole = () => {
    let aTokenAddress = process.argv[2], privKey = process.argv[3], prefundAmt = process.argv[4], APIKEY = process.argv[5], rpcurl = process.argv[6]
    prefundAmt = parseFloat(prefundAmt)
    const config = new TestAaveConfig(aTokenAddress, privKey, prefundAmt, APIKEY)
    main(config, rpcurl)
}


processConsole()




