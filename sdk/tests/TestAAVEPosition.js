const { FunWallet } = require("../index")
const ethers = require('ethers')

const main = async () => {
    const ATokenAddress = "0xC42f40B7E22bcca66B3EE22F3ACb86d24C997CC2" // Avalanche Fuji AAVE Dai


    const eoa = new ethers.Wallet(privateKey = "0x66f37ee92a08eebb5da72886f3c1280d5d1bd5eb8039f52fdb8062df7e364206") // Metamask browser side etc
    const wallet = new FunWallet(eoa)
    const treasuryAddr = await wallet.init()


    // Fund Wallet
    // const tx = await wallet.eoa.sendTransaction({ to: treasuryAddr, from: eoa.address, value: ethers.utils.parseEther(".3") })
    // const fundReceipt = await tx.wait()
    
    const approveTokenTX = await wallet.createTokenApprovalTx(ATokenAddress)
    await wallet.deployTokenApprovalTx(approveTokenTX)



    const aaveWalletOps = await wallet.createWallet("AAVE")
    const { walletCreationOp, actionExecutionOpHash } = aaveWalletOps

    const deplomentReceipt = await wallet.deployWallet(walletCreationOp)
    console.log(deplomentReceipt)
    console.log("Created Wallet")


    // after some time
    const executionReceipt = await wallet.executeAction(actionExecutionOpHash)
    console.log(executionReceipt)

}



main()