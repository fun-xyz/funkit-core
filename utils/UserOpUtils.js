const ethers = require('ethers')
const fetch = require('node-fetch')
async function createUserOp(funWalletDataProvider, { to, data }, gasLimit = 0, noInit = false, calldata = false) {
    return await funWalletDataProvider.createSignedUserOp({ target: to, data, noInit, calldata, gasLimit })
}

const priceURL="https://min-api.cryptocompare.com/data/price"


async function deployUserOp(transaction, bundlerClient, funWalletDataProvider) {
    const { op } = transaction.data
    const userOpHash = await bundlerClient.sendUserOpToBundler(op)
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
async function getPriceData(symbol) {
    const data=await fetch(`${priceURL}?fsym=${symbol}&tsyms=USD`)
    const price=await data.json()
    return price.USD;
}
module.exports = {
    createUserOp,
    deployUserOp,
    gasCalculation
}