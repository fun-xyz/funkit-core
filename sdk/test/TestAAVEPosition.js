const { FunWallet, EOAAAVEWithdrawal, AccessControlSchema } = require("../index")
const ethers = require('ethers')
const { TestAaveConfig, FunWalletConfig } = require("../utils/configs/walletConfigs")
const chain = '43113' //avax fuji 
const { DataServer } = require('../utils/DataServer')


const main = async (config, rpcurl) => {
    if (!rpcurl) {
        const chainInfo = await DataServer.getChainInfo(chain)
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

    const module = new EOAAAVEWithdrawal(config.aTokenAddress, chain, 10)
    const withdrawEntirePosition = wallet.addModule(module)



    // Deploy the FunWallet
    const deployWalletReceipt = await wallet.deploy()
    console.log("Creation Succesful:\n", deployWalletReceipt.receipt)

    const modulePreExecTxs = await module.getPreExecTxs(wallet);
    await wallet.deployTxs(modulePreExecTxs)

    console.assert(await module.verifyRequirements(wallet), "PreExecTxs Failed")

    // Create a tx that exits an EOA's Aave poisition to be called at a later point
    const aaveActionTx = await wallet.createModuleExecutionTx(withdrawEntirePosition)

    // Create & deploy a tx that gives the FunWallet authorization to close the EOA's Aave position
    // const tokenApprovalReceipt = await wallet.deployTokenApproval(config.aTokenAddress)
    // console.log("Approval Succesful:\n", tokenApprovalReceipt)

    // After some time, deploy the Aave withdrawal action
    const aaveWithdrawalReceipt = await FunWallet.deployTx(aaveActionTx, config.APIKEY)
    console.log("Execution Succesful:\n", aaveWithdrawalReceipt)

}

const processConsole = () => {
    let aTokenAddress = process.argv[2], privKey = process.argv[3], prefundAmt = process.argv[4], APIKEY = process.argv[5], rpcurl = process.argv[6]
    prefundAmt = parseFloat(prefundAmt)
    const config = new TestAaveConfig(aTokenAddress, privKey, prefundAmt, APIKEY)
    main(config, rpcurl)
}


processConsole()




