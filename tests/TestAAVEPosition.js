const { FunWallet } = require("../index")
const ethers = require('ethers')

const ATokenAddress = "0xC42f40B7E22bcca66B3EE22F3ACb86d24C997CC2" // Avalanche Fuji AAVE Dai
const privKey = "c5ff68eee74d447b88d5d0dd1d438b37f30a4c0b1e41e9c485c6e2ea282d1488"

const main = async () => {
    // Create an EOA instance with ethers
    const eoa = new ethers.Wallet(privKey)

    // Create a new FunWallet instance, initially funded with 0.3 AVAX to cover gas fees
    const wallet = new FunWallet(eoa, ".3")

    // Initialize the FunWallet instance
    await wallet.init()

    // Add the withdraw from aave action to the FunWallet
    await wallet.addAction("AAVE", ATokenAddress)

    // Deploy the FunWallet with the withdraw from Aave action
    const { receipt: deplomentReceipt, executionHash } = await wallet.deployWallet()
    console.log("Creation Succesful:\n", deplomentReceipt)    

    // Deploy a transaction approving the FunWallet to move the aave tokens from the EOA
    const approveReceipt = await wallet.deployTokenApprovalTx()
    console.log("Approval Succesful:\n", approveReceipt)

    // after some time
    const executionReceipt = await wallet.executeAction(executionHash)
    console.log("Execution Succesful:\n", executionReceipt)

}

main()