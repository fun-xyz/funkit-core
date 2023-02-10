const { FunWalletConfig } = require("../utils/configs/walletConfigs")
const { EoaAaveWithdrawal } = require("../src/modules/index")
const { FunWallet } = require("../index")

const ethers = require('ethers')

const CHAIN = '43113' // avax fuji 
// const USDC_MUMBAI = "0x7EA2be2df7BA6E54B1A9C70676f668455E329d29"
// const DAI_MUMBAI = "0x6B175474E89094C44Da98b954EedeAC495271d0F"
// const USDT_MUMBAI = "0xA02f6adc7926efeBBd59Fd43A84f4E0c0c91e832"

// const USDC_MAINNET = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
// const DAI_MAINNET = "0x6B175474E89094C44Da98b954EedeAC495271d0F"
// const USDT_MAINNET = "0xA02f6adc7926efeBBd59Fd43A84f4E0c0c91e832"


const main = async (tokenAddr, privKey, prefundAmt, APIKEY, rpcurl) => {
    const provider = new ethers.providers.JsonRpcProvider(rpcurl)
    const eoa = new ethers.Wallet(privKey, provider)

    // Create a FunWallet with the above access control schema, prefunded with prefundAmt AVAXa
    const walletConfig = new FunWalletConfig(eoa, CHAIN, APIKEY, prefundAmt)
    const wallet = new FunWallet(walletConfig)

    const module = new EoaAaveWithdrawal(tokenAddr, CHAIN)

    await wallet.init()
    await wallet.addModule(module)

    const modulePreExecTxs = await module.getPreExecTxs(tokenAddr)

    await wallet.deployTxs(modulePreExecTxs)
    await module.verifyRequirements(tokenAddr)

    const deployWalletReceipt = await wallet.deploy()
    console.log("Creation Succesful:\n", deployWalletReceipt.receipt)

    const aaveActionTx = await module.createWithdraw(tokenAddr)

    const withdrawReceipt = await wallet.deployTx(aaveActionTx)
    console.log("Execution Succesful:\n", withdrawReceipt)
}

const processConsole = () => {
    const [tokenAddr, privKey, prefundAmt, APIKEY, rpcurl] = process.argv.slice(2)
    main(tokenAddr, privKey, prefundAmt, APIKEY, rpcurl)
}


processConsole()




