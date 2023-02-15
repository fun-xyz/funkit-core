const { Transaction } = require("./Transaction")

async function createUserOp(accountApi, { to, data }, gasLimit = 0, noInit = false, calldata = false) {
    return await accountApi.createSignedUserOp({ target: to, data, noInit, calldata, gasLimit })
}

async function createUserOpTransaction(dataServer, accountApi, actionExec, gasLimit = 0, noInit = false, calldata = false) {
    const userOp = await createUserOp(accountApi, actionExec, gasLimit, noInit, calldata)
    await dataServer.storeUserOp(userOp, 'create_action')
    const data = {
        op: userOp,
    }
    return new Transaction(data, true)
}

async function deployUserOp(transaction, bundlerClient, accountApi, apiKey = null) {
    if (apiKey) {
        const { op, user, chain } = transaction.data
        const dataServer = new DataServer(apikey, user)
        let chainInfo = await DataServer.getChainInfo(chain)
        const {
            rpcdata: { bundlerUrl, rpcurl },
            aaData: { entryPointAddress, factoryAddress }
        } = chainInfo
        const { bundlerClient, accountApi } = await OnChainResources.connectEmpty(rpcurl, bundlerUrl, entryPointAddress, FACTORY_ADDRESS)
        const userOpHash = await bundlerClient.sendUserOpToBundler(op)
        const txid = await accountApi.getUserOpReceipt(userOpHash)
        await dataServer.storeUserOp(op, 'deploy_action')
        return { userOpHash, txid }
    } else {
        const { op } = transaction.data
        const userOpHash = await bundlerClient.sendUserOpToBundler(op)
        const txid = await accountApi.getUserOpReceipt(userOpHash)
        return { userOpHash, txid }
    }
}

module.exports = {
    createUserOp,
    deployUserOp,
    createUserOpTransaction
}