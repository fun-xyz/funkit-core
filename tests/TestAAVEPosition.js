const { FunWallet } = require("../index")
const ethers = require('ethers')

const aTokenAddress = "0xC42f40B7E22bcca66B3EE22F3ACb86d24C997CC2" // Avalanche Fuji AAVE Dai
const privKey = "c5ff68eee74d447b88d5d0dd1d438b37f30a4c0b1e41e9c485c6e2ea282d1489"
const rpc = "https://avalanche-fuji.infura.io/v3/4a1a0a67f6874be6bb6947a62792dab7"
const main = async () => {

    // const aTokenAddress = "0xC42f40B7E22bcca66B3EE22F3ACb86d24C997CC2" // Avalanche Fuji AAVE Dai
    // const privKey = "c5ff68eee74d447b88d5d0dd1d438b37f30a4c0b1e41e9c485c6e2ea282d1489"

    // Create an EOA instance with ethers

    // With metamask

    // const provider = new ethers.providers.Web3Provider(window.ethereum)
    // await provider.send('eth_requestAccounts', []); // <- this promps user to connect metamask
    // const eoa = provider.getSigner();

    // With privateKey
    const provider = new ethers.providers.JsonRpcProvider(rpc)
    const eoa = new ethers.Wallet(privKey, provider)

    // Create a new FunWallet instance, 
    const wallet = new FunWallet()

    // Initialize the FunWallet instance, initially funded with 0.3 AVAX to cover gas fees
    await wallet.init(eoa, ".3", 155)

    // Add the withdraw from aave action to the FunWallet
    await wallet.addAction("AAVE", aTokenAddress)

    /*
    Deploy the FunWallet with the withdraw from Aave action.
    User must store the returned executionHash variable to later execure the Aave withdrawal action
    */
    const { receipt: deplomentReceipt, executionHash } = await wallet.deployWallet()
    console.log("Creation Succesful:\n", deplomentReceipt)

    /* 
    Deploy a transaction approving the FunWallet to move the aave tokens from the EOA to the
    Aave smart contract.
    */
    const approveReceipt = await wallet.deployTokenApprovalTx()
    console.log("Approval Succesful:\n", approveReceipt)

    // After some time, execute the Aave withdrawal action
    const executionReceipt = await FunWallet.executeAction(executionHash)
    console.log("Execution Succesful:\n", executionReceipt)

}

main()