const { FunWallet, TransferToken, AAVEWithdrawal, AccessControlSchema } = require("../index")
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

    const to='0xA596e25E2CbC988867B4Ee7Dc73634329E674d9e'
    const module = new TransferToken(to, '10000', config.aTokenAddress) //0x5425890298aed601595a70AB815c96711a31Bc65 1000000=1usdc
    const action = wallet.addModule(module)

    // Deploy the FunWallet
    const deployWalletReceipt = await wallet.deploy()
    console.log("Creation Succesful:\n", deployWalletReceipt.receipt)

    //this does nothing because there is no passthrough
    const modulePreExecTxs = await module.getPreExecTxs(deployWalletReceipt.address);
    const txDeployReceipt= await wallet.deployTxs(modulePreExecTxs)
    console.log("Fun Wallet Address:\n", deployWalletReceipt.address)

    console.log(action)
    // Create a tx that exits an EOA's Aave poisition to be called at a later point
    const transferActionTx = await wallet.createModuleExecutionTx(action)
    console.log("CreateTx Successful :\n", transferActionTx)
    // Create & deploy a tx that gives the FunWallet authorization to close the EOA's Aave position
    // const tokenApprovalReceipt = await wallet.deployTokenApproval(config.aTokenAddress)
    // console.log("Approval Succesful:\n", tokenApprovalReceipt)

    // After some time, deploy the Aave withdrawal action
    const receipt = await FunWallet.deployTx(transferActionTx, config.APIKEY)
    console.log("Execution Succesful:\n", receipt)

}

const processConsole = () => {
    let aTokenAddress = process.argv[2], privKey = process.argv[3], prefundAmt = process.argv[4], APIKEY = process.argv[5], rpcurl = process.argv[6]
    prefundAmt = parseFloat(prefundAmt)
    const config = new TestAaveConfig(aTokenAddress, privKey, prefundAmt, APIKEY)
    main(config, rpcurl)
}


processConsole()




