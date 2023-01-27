const { FunWallet, AAVEWithdrawal, AccessControlSchema, wallets } = require("../index")
const { TestAaveConfig, FunWalletConfig } = require("../utils/walletConfigs")
const { AAVEWallet } = wallets
const ethers = require('ethers')

// const assetAddr = "0xFc7215C9498Fc12b22Bc0ed335871Db4315f03d3" // Avax aave dai not adai
const rpc = "https://avalanche-fuji.infura.io/v3/4a1a0a67f6874be6bb6947a62792dab7"

const main = async (config,rpc) => {
    if (!rpc) {
        const chainInfo = await FunWallet.getChainInfo(chain)
        rpc = chainInfo.rpcdata.rpcurl //https://avalanche-fuji.infura.io/v3/4a1a0a67f6874be6bb6947a62792dab7
    }

    const provider = new ethers.providers.JsonRpcProvider(rpc)
    const eoa = new ethers.Wallet(config.privKey, provider)

    const schema = new AccessControlSchema()
    const withdrawEntirePosition = schema.addAction(AAVEWithdrawal(config.aTokenAddress))
    // Add the withdraw from aave action to the FunWallet

    // Create a new FunWallet instance, 
    const chain = '43113'
    // Initialize the FunWallet instance, initially funded with 0.3 AVAX to cover gas fees

    const walletConfig = new FunWalletConfig(eoa, schema, config.prefundAmt, chain, config.APIKEY)
    const aaveWallet = new AAVEWallet(walletConfig)

    const create = await aaveWallet.createSupply(assetAddr)
    const receipt1 = await FunWallet.deployActionTx(create)
    console.log(receipt1)

    const exec = await aaveWallet.execSupply(config.aTokenAddress)
    const receipt2 = await FunWallet.deployActionTx(exec)
    console.log(receipt2)
}

const processConsole = () => {
    let aTokenAddress = process.argv[2], privKey = process.argv[3], prefundAmt = process.argv[4], APIKEY = process.argv[5], rpcurl = process.argv[6]
    prefundAmt = parseFloat(prefundAmt)
    const config = new TestAaveConfig(aTokenAddress, privKey, prefundAmt, APIKEY)
    main(config, rpcurl)
}


processConsole()