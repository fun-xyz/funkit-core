const { FunWallet, AAVEWithdrawal, AccessControlSchema } = require("../index")
const ethers = require('ethers')

const rpc = "https://avalanche-fuji.infura.io/v3/4a1a0a67f6874be6bb6947a62792dab7"
// const aTokenAddress = "0xC42f40B7E22bcca66B3EE22F3ACb86d24C997CC2" // Avalanche Fuji AAVE Dai

const main = async () => {


    // Create an EOA instance with ethers

    // With metamask

    // const provider = new ethers.providers.Web3Provider(window.ethereum)
    // await provider.send('eth_requestAccounts', []); // <- this promps user to connect metamask
    // const eoa = provider.getSigner();

    // With privateKey

    const privKey = "66f37ee92a08eebb5da72886f3c1280d5d1bd5eb8039f52fdb8062df7e364206"
    const provider = new ethers.providers.JsonRpcProvider(rpc)
    const eoa = new ethers.Wallet(privKey, provider)

    const aTokenAddress = "0x210a3f864812eAF7f89eE7337EAA1FeA1830C57e" // Avalanche Fuji AAVE Dai

    const schema = new AccessControlSchema()

    const withdrawEntirePosition = schema.addAction(AAVEWithdrawal(aTokenAddress))
    // Add the withdraw from aave action to the FunWallet



    // Create a new FunWallet instance, 
    const prefundAmt = 0 // eth
    const chain = '43113'
    // Initialize the FunWallet instance, initially funded with 0.3 AVAX to cover gas fees
    const wallet = new FunWallet(eoa, schema, prefundAmt, chain)

    const createWalletReceipt = await wallet.deploy()
    console.log("Creation Succesful:\n", createWalletReceipt)


    const aaveActionTx = await wallet.createActionTx(withdrawEntirePosition)

    /* 
    Deploy a transaction approving the FunWallet to move the aave tokens from the EOA to the
    Aave smart contract.
    */

    const approveReceipt = await wallet.deployTokenApproval(aTokenAddress)
    console.log("Approval Succesful:\n", approveReceipt)

    // After some time, execute the Aave withdrawal action

    const executionReceipt = await FunWallet.deployActionTx(aaveActionTx, chain)
    console.log("Execution Succesful:\n", executionReceipt)


}

main()