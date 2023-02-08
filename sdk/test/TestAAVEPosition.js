const { FunWallet, AccessControlSchema } = require("../index")
const { ApproveAndSwap } = require("../modules")
const ethers = require('ethers')
const { TestAaveConfig, FunWalletConfig } = require("../utils/configs/walletConfigs")
const chain = '43113' //avax fuji 
const { DataServer } = require('../utils/DataServer')

const USDC_MUMBAI = "0x7EA2be2df7BA6E54B1A9C70676f668455E329d29"
const DAI_MUMBAI = "0x6B175474E89094C44Da98b954EedeAC495271d0F"
const USDT_MUMBAI = "0xA02f6adc7926efeBBd59Fd43A84f4E0c0c91e832"

const USDC_MAINNET = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
const DAI_MAINNET = "0x6B175474E89094C44Da98b954EedeAC495271d0F"
const USDT_MAINNET = "0xA02f6adc7926efeBBd59Fd43A84f4E0c0c91e832"




const main = async (config, rpcurl) => {
    const provider = new ethers.providers.JsonRpcProvider(rpcurl)
    const eoa = new ethers.Wallet(config.privKey, provider)

    // Create a FunWallet with the above access control schema, prefunded with prefundAmt AVAXa
    const walletConfig = new FunWalletConfig(eoa, config.prefundAmt, chain, config.APIKEY)
    const wallet = new FunWallet(walletConfig)

    await wallet.init()

    const swapModule = new ApproveAndSwap()
    await wallet.addModule(swapModule)
    const tx = await swapModule.createExecution(USDC_MAINNET, DAI_MAINNET, 1)
    console.log(tx)
    await FunWallet.deployTx(tx, config.APIKEY)
}

const processConsole = () => {
    let aTokenAddress = process.argv[2], privKey = process.argv[3], prefundAmt = process.argv[4], APIKEY = process.argv[5], rpcurl = process.argv[6]

    prefundAmt = parseFloat(prefundAmt)
    rpcurl = "http://127.0.0.1:8545/"
    const config = new TestAaveConfig(aTokenAddress, privKey, prefundAmt, APIKEY)
    main(config, rpcurl)
}


processConsole()




