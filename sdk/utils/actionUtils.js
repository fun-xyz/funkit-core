const { Transaction } = require("./Transaction")



async function createAction(accountApi, { to, data }, gasLimit = 0, noInit = false, calldata = false) {
    return await accountApi.createSignedUserOp({ target: to, data, noInit, gasLimit, calldata })
}

async function createTransactionAction(accountApi, { to, data }, gasLimit = 0, noInit = false, calldata = false) {
    const op = await accountApi.createSignedUserOp({ target: to, data, noInit, gasLimit, calldata })
    return new Transaction({ op }, true)
}

/**
    * adds type of action for FunWallet
    * @params type, params
    * type - string of "AAVE" (uniswap and more will be supported later)
    * params - parameters to insert, (token address)
    */
function addAction(info) {
    this.actionStore.push(info)
}

module.exports = {
    createAction,
    createTransactionAction
}