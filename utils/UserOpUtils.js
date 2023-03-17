const fetch = require('node-fetch')

const PRICE_URL = "https://min-api.cryptocompare.com/data/price"

async function createUserOp(funWalletDataProvider, { to, data }, gasLimit = 0, noInit = false, calldata = false) {
    return await funWalletDataProvider.createSignedUserOp({ target: to, data, noInit, calldata, gasLimit })
}

async function deployUserOp(transaction, bundlerClients, funWalletDataProvider) {
    const { op } = transaction.data
    let userOpHash
    for (let i = 0; i < bundlerClients.length; i++) {
        try {
            userOpHash = await bundlerClients[i].sendUserOpToBundler(op)
            break;
        } catch (error) {
            console.log("switching bundler due to errors", error)
            i++
        }
    }
    const txid = await funWalletDataProvider.getUserOpReceipt(userOpHash)

    return { userOpHash, txid }
}

async function gasCalculation(receipt, ethersProvider, chain) {
    const txReceipt = await ethersProvider.getTransactionReceipt(receipt.txid)
    const gasUsed = txReceipt.gasUsed.toNumber()
    const gasPrice = txReceipt.effectiveGasPrice.toNumber() * 1e-18
    const gasTotal = gasUsed * gasPrice
    const chainPrice = await getPriceData(chain)
    const gasUSD = gasTotal * chainPrice
    return { gasUsed, gasUSD }
}

async function getPriceData(chainCurrency) {
    const data = await fetch(`${PRICE_URL}?fsym=${chainCurrency}&tsyms=USD`)
    const price = await data.json()
    return price.USD;
}

module.exports = {
    createUserOp,
    deployUserOp,
    gasCalculation
}