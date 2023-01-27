


async function _createAction(accountApi, { to, data }, gasLimit = 0, noInit = false, calldata = false) {
    return await accountApi.createSignedUserOp({ target: to, data, noInit, gasLimit, calldata })
}
module.exports={
    _createAction,
}