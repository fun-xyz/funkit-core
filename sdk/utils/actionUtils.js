


async function _createAction(accountApi, { to, data }, gasLimit = 0, noInit = false, calldata = false) {
    return await accountApi.createSignedUserOp({ target: to, data, noInit, gasLimit, calldata })
}
// async function createAllActionTx() {
//     return await Promise.all(Object.values(this.actionStore).map((action) => {
//         return this._createAAVEWithdrawalExec(action)
//     }))
// }
// async function createActionTxs(actions) {
//     return await Promise.all(actions.map((action) => {
//         return this._createAAVEWithdrawalExec(action)
//     }))
// }



/**
    * adds type of action for FunWallet
    * @params type, params
    * type - string of "AAVE" (uniswap and more will be supported later)
    * params - parameters to insert, (token address)
    */
function addAction(info) {
    this.actionStore.push(info)
}

module.exports={
    _createAction,
}