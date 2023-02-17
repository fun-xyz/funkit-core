const ethers = require('ethers')
async function createUserOp(funWalletDataProvider, { to, data }, gasLimit = 0, noInit = false, calldata = false) {
    return await funWalletDataProvider.createSignedUserOp({ target: to, data, noInit, calldata, gasLimit})
}

async function deployUserOp(transaction, bundlerClient, funWalletDataProvider, ethersProvider) {
    const { op } = transaction.data
    const userOpHash = await bundlerClient.sendUserOpToBundler(op)
    const txid = await funWalletDataProvider.getUserOpReceipt(userOpHash)

    const receipt=await ethersProvider.getTransactionReceipt(txid)
    const gasUsed=receipt.gasUsed.toNumber()
    
    return { userOpHash, txid, gasUsed}
}

module.exports = {
    createUserOp,
    deployUserOp
}