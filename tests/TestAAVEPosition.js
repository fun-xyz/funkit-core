const { FunWallet, AAVEWithdrawal, AccessControlSchema } = require("../index")
const ethers = require('ethers')

const rpc = "https://avalanche-fuji.infura.io/v3/4a1a0a67f6874be6bb6947a62792dab7"
const privKey = "66f37ee92a08eebb5da72886f3c1280d5d1bd5eb8039f52fdb8062df7e364206"
const aTokenAddress = "0x210a3f864812eAF7f89eE7337EAA1FeA1830C57e" // Avalanche Fuji AAVE Dai
const prefundAmt = 0 // eth
const chainID = '43113'

const main = async () => {

    // Create an EOA instance

    // 1. With metamask
    // const provider = new ethers.providers.Web3Provider(window.ethereum)
    // await provider.send('eth_requestAccounts', []); // <- this promps user to connect metamask
    // const eoa = provider.getSigner();

    // 2. With a known private key
    const provider = new ethers.providers.JsonRpcProvider(rpc)
    const eoa = new ethers.Wallet(privKey, provider)

    // Create an access control schema with one action: withdraw a user's funds from Aave
    const schema = new AccessControlSchema()
    const withdrawEntirePosition = schema.addAction(AAVEWithdrawal(aTokenAddress))
    
    // Create a FunWallet with the above access control schema, prefunded with prefundAmt AVAX
    const wallet = new FunWallet(eoa, schema, prefundAmt, chainID)
    
    // Deploy the FunWallet
    const walletDeployReceipt = await wallet.deploy()
    console.log("Creation Succesful:\n", walletDeployReceipt)
    
    // Create a tx that exits an EOA's Aave poisition to be called at a later point
    const aaveActionTx = await wallet.createActionTx(withdrawEntirePosition)

    // Create & deploy a tx that gives the FunWallet authorization to close the EOA's Aave position
    const tokenApprovalReceipt = await wallet.deployTokenApproval(aTokenAddress)
    console.log("Approval Succesful:\n", tokenApprovalReceipt)

    // After some time, deploy the Aave withdrawal action
    const aaveWithdrawalReceipt = await FunWallet.deployActionTx(aaveActionTx)
    console.log("Execution Succesful:\n", aaveWithdrawalReceipt)

}

main()