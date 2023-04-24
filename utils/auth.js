const { Wallet } = require("ethers")
const { v4: uuidv4 } = require('uuid')
const { DataServer } = require('../servers')

const getSignerFromPrivateKey = (key) => {
    return new Wallet(key)
}

const getSignerFromProvider = async (provider) => {
    await provider.send('eth_requestAccounts', [])
    return provider.getSigner()
}

const getStoredUniqueId = async (authId) => {
    const auth = await DataServer.getAuth(authId)
    return auth.data ? auth.data.wallet : null
}

const setStoredUniqueId = async (authId, uniqueId) => {
    const words = authId.split("###")
    let method
    if (words[0].startsWith("0x")) {
        method = "eoa"
    } else {
        method = words[0]
    }
    await DataServer.setAuth(authId, method, uniqueId)
}

const getUniqueId = async (authId) => {
    let uniqueId
    const storedUniqueId = await getStoredUniqueId(authId)
    if (storedUniqueId) {
        uniqueId = storedUniqueId
    } else {
        uniqueId = uuidv4()
        await setStoredUniqueId(authId, uniqueId)
    }
    return uniqueId
}

module.exports = { getSignerFromPrivateKey, getSignerFromProvider, getUniqueId, getStoredUniqueId, setStoredUniqueId };