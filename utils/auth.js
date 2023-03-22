const { Wallet } = require("ethers")


const getSignerFromPrivateKey = (key) => {
    return new Wallet(key)
}

const getSignerFromProvider = async (provider) => {
    await provider.send('eth_requestAccounts', [])
    return provider.getSigner()
}

module.exports = { getSignerFromPrivateKey, getSignerFromProvider };
