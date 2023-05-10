const { verifyFunctionParams, validateClassInstance, parseOptions, gasCalculation, getChainFromData, getUniqueId } = require("../utils")


/**
 * returns a url for the Transak browser widget with onramping configuration
 * @param {*} txOptions 
 * @returns string containing the url of fiat onramp hosted on transak
 */
const transakOnRamp = async (address, options = global) => {
    const { chain } = await parseOptions(options, "Wallet.onramp")
    //for production, remove the -stg 
    const baseUrl = "https://global-stg.transak.com"
    //pull the api key from AWS
    const apiKeyParam = "apiKey=" + ""
    const walletAddressParam = "&walletAddress=" + address
    const networkParam = "&network=ethereum"
    const buyModeParam = "&productsAvailed=BUY"
    //for Moonpay, you would need to add a signed url
    //the AWS backend should have a secret key and sign the whole url with it
    const url = baseUrl + "/?" + apiKeyParam + networkParam + walletAddressParam + buyModeParam
    //const singedurl = getSignedURL(url)
    //see moonpay docs for how to construct the HMAC using the secret key
    return url
}

/**
 * returns a url of the Transak browser widget with offramping configuration
 * @param {*} txOptions 
 * @returns string containing the url of fiat offramp hosted on transak
 */
const transakOffRamp = async (txOptions = global) => {
    const options = await parseOptions(txOptions, "Wallet.onramp")
    const chain = await this._getFromCache(options.chain)
    const walletAddress = await this.getAddress({ chain })
    //for production, remove the -stg 
    const baseUrl = "https://global-stg.transak.com"
    //pull the api key from AWS
    const apiKeyParam = "apiKey=" + "Replace this with the variable returned from AWS"
    const walletAddressParam = "&walletAddress=" + walletAddress
    const networkParam = "&network=ethereum"
    const sellModeParam = "&productsAvailed=SELL"
    return baseUrl + "/?" + apiKeyParam + networkParam + walletAddressParam + sellModeParam
    //this url also needs to be signed in order to use it with moonpay
}





/**
 * returns a url for the Transak browser widget with onramping configuration
 * @param {*} txOptions 
 * @returns string containing the url of fiat onramp hosted on transak
 */
 const moonPayOnRamp = async (txOptions = global) => {
    const options = await parseOptions(txOptions, "Wallet.onramp")
    const chain = await this._getFromCache(options.chain)
    const walletAddress = await this.getAddress({ chain })
    //for production, remove the -stg 
    const baseUrl = "https://global-stg.transak.com"
    //pull the api key from AWS
    const apiKeyParam = "apiKey=" + "Replace this with the variable returned from AWS"
    const walletAddressParam = "&walletAddress=" + walletAddress
    const networkParam = "&network=ethereum"
    const buyModeParam = "&productsAvailed=BUY"
    //for Moonpay, you would need to add a signed url
    //the AWS backend should have a secret key and sign the whole url with it
    const url = baseUrl + "/?" + apiKeyParam + networkParam + walletAddressParam + buyModeParam
    //const singedurl = getSignedURL(url)
    //see moonpay docs for how to construct the HMAC using the secret key
    return url
}

/**
 * returns a url of the Transak browser widget with offramping configuration
 * @param {*} txOptions 
 * @returns string containing the url of fiat offramp hosted on transak
 */
const moonPayOffRamp = async (txOptions = global) => {
    const options = await parseOptions(txOptions, "Wallet.onramp")
    const chain = await this._getFromCache(options.chain)
    const walletAddress = await this.getAddress({ chain })
    //for production, remove the -stg 
    const baseUrl = "https://global-stg.transak.com"
    //pull the api key from AWS
    const apiKeyParam = "apiKey=" + "Replace this with the variable returned from AWS"
    const walletAddressParam = "&walletAddress=" + walletAddress
    const networkParam = "&network=ethereum"
    const sellModeParam = "&productsAvailed=SELL"
    return baseUrl + "/?" + apiKeyParam + networkParam + walletAddressParam + sellModeParam
    //this url also needs to be signed in order to use it with moonpay
}

module.exports = {transakOffRamp, transakOnRamp, moonPayOnRamp, moonPayOffRamp}