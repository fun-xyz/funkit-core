const APIURL = 'https://vyhjm494l3.execute-api.us-west-2.amazonaws.com/dev'
const fetch = require("node-fetch")
const {generateSha256}=require('./tools')


async function storeEVMCall(receipt, user, apiKey) {
    try {
        return await fetch(`${APIURL}/save-evm-receipt`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Api-Key': apiKey
            },
            redirect: 'follow',
            referrerPolicy: 'no-referrer',
            body: JSON.stringify({
                txHash: receipt.transactionHash,
                receipt,
                organization: user
            })
        }).then(r => r.json()).then(r => console.log(r.message + " type: evm_receipt"))
    }
    catch (e) {
        console.log(e)
    }

}

async function _getStoredUserOp(opHash) {
    const op = await this._getUserOpInternal(opHash)
    Object.keys(op).map(key => {
        if (op[key].type == "BigNumber") {
            op[key] = ethers.BigNumber.from(op[key].hex)
        }
    })
    return op
}
async function _getUserOpInternal(userOpHash, apiKey) {
    try {
        return await fetch(`${APIURL}/get-user-op`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Api-Key': apiKey
            },
            redirect: 'follow',
            referrerPolicy: 'no-referrer',
            body: JSON.stringify({
                userOpHash: userOpHash,
            })
        }).then((r) => r.json()).then((r) => { return r.data })
    } catch (e) {
        console.log(e)
    }
}

async function getChainInfo(chain) {
    return await fetch(`${APIURL}/get-chain-info`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        redirect: 'follow',
        referrerPolicy: 'no-referrer',
        body: JSON.stringify({
            chain,
        })
    }).then((r) => r.json()).then((r) => {
        return r.data
    })
}


async function _storeUserOp(op, type, balance, apikey) {
    const outOp = await _getPromiseFromOp(op)
    const sig = generateSha256(outOp.signature.toString())

    await _storeUserOpInternal(outOp, sig, apikey, 'fun', type, balance) //storing the customer name, should this be done somehow differently?
    return sig
}

async function _getPromiseFromOp(op) {
    const out = {}
    await Promise.all(Object.keys(op).map(async (key) => {
        out[key] = await op[key]
    }))
    return out
}
async function _storeUserOpInternal(userOp, userOpHash, apikey, user, type, balance) {
    try {
        await fetch(`${APIURL}/save-user-op`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Api-Key': apikey
            },
            redirect: 'follow',
            referrerPolicy: 'no-referrer',
            body: JSON.stringify({
                userOpHash: userOpHash,
                userOp: userOp,
                user,
                type,
                balance,
            })
        }).then((r) => r.json()).then((r) => { console.log(r.message + " type: " + type) })
    }
    catch (e) {
        console.log(e)
    }

}



module.exports={
    storeEVMCall,
    getChainInfo,
    _storeUserOp
}