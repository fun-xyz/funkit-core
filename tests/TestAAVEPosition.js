const { FunWallet, AAVEWithdrawal, AccessControlSchema } = require("../index")
const ethers = require('ethers')
const chain = '43113' //avax fuji 

// Keeping these here for dev purposes, can delete during cleanup
// Avalanche Fuji AAVE Dai 0x210a3f864812eAF7f89eE7337EAA1FeA1830C57e
// const privKey = "66f37ee92a08eebb5da72886f3c1280d5d1bd5eb8039f52fdb8062df7e364206"
// const prefundAmt = 0 // eth or avax
// const APIKEY = 'YOUR_API_KEY'

const main = async (aTokenAddress, privKey, prefundAmt, APIKEY) => {
    const chainInfo = await FunWallet.getChainInfo(chain)
    const rpc = chainInfo.rpcdata.rpcurl //https://avalanche-fuji.infura.io/v3/4a1a0a67f6874be6bb6947a62792dab7

    prefundAmt = parseInt(prefundAmt)

    // 1. With metamask
    // const provider = new ethers.providers.Web3Provider(window.ethereum)
    // await provider.send('eth_requestAccounts', []); // <- this promps user to connect metamask
    // const eoa = provider.getSigner();

    // With privateKey

    const provider = new ethers.providers.JsonRpcProvider(rpc)
    const eoa = new ethers.Wallet(privKey, provider)

    // Create an access control schema with one action: withdraw a user's funds from Aave
    const schema = new AccessControlSchema()

    // Add the withdraw from aave action to the FunWallet
    const withdrawEntirePosition = schema.addAction(AAVEWithdrawal(aTokenAddress))
    

    // Create a new FunWallet instance, 

    // Initialize the FunWallet instance, initially funded with 0.3 AVAX to cover gas fees
    const wallet = new FunWallet(eoa, schema, prefundAmt, chain, APIKEY)

    const createWalletReceipt = await wallet.deploy()
    console.log("Creation Succesful:\n", createWalletReceipt)


    const aaveActionTx = await wallet.createActionTx(withdrawEntirePosition)

    // Create & deploy a tx that gives the FunWallet authorization to close the EOA's Aave position
    const tokenApprovalReceipt = await wallet.deployTokenApproval(aTokenAddress)
    console.log("Approval Succesful:\n", tokenApprovalReceipt)

    // After some time, deploy the Aave withdrawal action
    const aaveWithdrawalReceipt = await FunWallet.deployActionTx(aaveActionTx)
    console.log("Execution Succesful:\n", aaveWithdrawalReceipt)

}
//yarn test [aTokenAddress] [privKey] [preFundAmt] [apiKey]
//yarn test 0x210a3f864812eAF7f89eE7337EAA1FeA1830C57e 66f37ee92a08eebb5da72886f3c1280d5d1bd5eb8039f52fdb8062df7e364206 0.3 hnHevQR0y394nBprGrvNx4HgoZHUwMet5mXTOBhf
const processConsole = () => {
    main(process.argv[2], process.argv[3], process.argv[4], process.argv[5])
}


processConsole()