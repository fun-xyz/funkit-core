const { FunWallet, AccessControlSchema } = require("../index")
const { AAVEWithdrawal, Swap } = require("../modules")
const ethers = require('ethers')
const { TestAaveConfig, FunWalletConfig } = require("../utils/configs/walletConfigs")
const { TranslationServer } = require('../utils/TranslationServer')

const USDC_MUMBAI = "0x7EA2be2df7BA6E54B1A9C70676f668455E329d29"
const DAI_MUMBAI = "0x6B175474E89094C44Da98b954EedeAC495271d0F"
const USDT_MUMBAI = "0xA02f6adc7926efeBBd59Fd43A84f4E0c0c91e832"

const chain = "31337"

const main = async (config, rpcurl) => {
    if (!rpcurl) {
        const chainInfo = await TranslationServer.getChainInfo(chain)
        rpcurl = chainInfo.rpcdata.rpcurl //https://avalanche-fuji.infura.io/v3/4a1a0a67f6874be6bb6947a62792dab7
    }




    // 1. With metamask
    // const provider = new ethers.providers.Web3Provider(window.ethereum)
    // await provider.send('eth_requestAccounts', []); // <- this promps user to connect metamask
    // const eoa = provider.getSigner();

    // 2. With a known private key
    const provider = new ethers.providers.JsonRpcProvider(rpcurl)
    const eoa = new ethers.Wallet(config.privKey, provider)

    // Create a FunWallet with the above access control schema, prefunded with prefundAmt AVAXa
    const walletConfig = new FunWalletConfig(eoa, config.prefundAmt, chain, config.APIKEY)
    const wallet = new FunWallet(walletConfig)


    const module = new Swap()
    await wallet.init()

    const withdrawEntirePosition = wallet.addModule(module)

    // Deploy the FunWallet
    // const deployWalletReceipt = await wallet.deploy()


    await module.createNew(USDC_MUMBAI, DAI_MUMBAI)




    // Create a tx that exits an EOA's Aave poisition to be called at a later point
    // const aaveActionTx = await wallet.createModuleExecutionTx(withdrawEntirePosition)

    // Create & deploy a tx that gives the FunWallet authorization to close the EOA's Aave position
    // const tokenApprovalReceipt = await wallet.deployTokenApproval(config.aTokenAddress)
    // console.log("Approval Succesful:\n", tokenApprovalReceipt)

    // After some time, deploy the Aave withdrawal action
    // const aaveWithdrawalReceipt = await FunWallet.deployTx(aaveActionTx, config.APIKEY)
    // console.log("Execution Succesful:\n", aaveWithdrawalReceipt)

}

const processConsole = () => {
    let aTokenAddress = process.argv[2], privKey = process.argv[3], prefundAmt = process.argv[4], APIKEY = process.argv[5], rpcurl = process.argv[6]

    prefundAmt = parseFloat(prefundAmt)
    rpcurl = "http://127.0.0.1:8545/"
    const config = new TestAaveConfig(aTokenAddress, privKey, prefundAmt, APIKEY)
    main(config, rpcurl)
}


processConsole()




