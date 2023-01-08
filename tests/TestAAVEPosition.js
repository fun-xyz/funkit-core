const { FunWallet } = require("../index")
const ethers = require('ethers')

const main = async () => {
    const ATokenAddress = "0xC42f40B7E22bcca66B3EE22F3ACb86d24C997CC2" // Avalanche Fuji AAVE Dai
    const eoa = new ethers.Wallet(privateKey = "0x66f37ee92a08eebb5da72886f3c1280d5d1bd5eb8039f52fdb8062df7e364206") // Metamask browser side etc

    const params = FunWallet.AAVEWalletParams(ATokenAddress)

    const wallet = await FunWallet.init(eoa, "AAVE", "0", params)

    const approveReceipt = await wallet.deployTokenApprovalTx()
    console.log("Approval Succesful:\n", approveReceipt)

    const deplomentReceipt = await wallet.deployWallet()
    console.log("Creation Succesful:\n", deplomentReceipt)
    // after some tim
    const executionReceipt = await wallet.executeAction(wallet.actionExecutionOpHash)
    console.log("Execution Succesful:\n", executionReceipt)

}

main()