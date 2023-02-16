async function createUserOp(funWalletDataProvider, { to, data }, gasLimit = 0, noInit = false, calldata = false) {
    return await funWalletDataProvider.createSignedUserOp({ target: to, data, noInit, calldata, gasLimit})
}

async function deployUserOp(transaction, bundlerClient, funWalletDataProvider) {
    const { op } = transaction.data
    const userOpHash = await bundlerClient.sendUserOpToBundler(op)
    const txid = await funWalletDataProvider.getUserOpReceipt(userOpHash)
    return { userOpHash, txid }
}

module.exports = {
    createUserOp,
    deployUserOp
}