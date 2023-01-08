const { FunWallet } = require("../index")
const ethers = require('ethers')

const main = async () => {
    const ATokenAddress = "0xC42f40B7E22bcca66B3EE22F3ACb86d24C997CC2" // Avalanche Fuji AAVE Dai
    const eoa = new ethers.Wallet(privateKey = "c5ff68eee74d447b88d5d0dd1d438b37f30a4c0b1e41e9c485c6e2ea282d1489") // Metamask browser side etc

    const params = { tokenAddress: ATokenAddress }

    const wallet = new FunWallet(eoa, "AAVE", ".3", params, 12)
    await wallet.init()

    const approveReceipt = await wallet.deployTokenApprovalTx()
    console.log("Approval Succesful:\n", approveReceipt)

    const { receipt: deplomentReceipt, executionHash } = await wallet.deployWallet()
    console.log("Creation Succesful:\n", deplomentReceipt)
    // after some time
    const executionReceipt = await wallet.executeAction(executionHash)
    console.log("Execution Succesful:\n", executionReceipt)

}

main()