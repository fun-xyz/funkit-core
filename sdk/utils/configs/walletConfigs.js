
class TestAaveConfig {
    constructor(aTokenAddress, privKey, prefundAmt, APIKEY) {
        this.aTokenAddress = aTokenAddress
        this.privKey = privKey
        this.prefundAmt = prefundAmt
        this.APIKEY = APIKEY
    }
}

class FunWalletConfig {
    // USER SIGNATURE REQUIRED to fund wallet
    //  * 
    //  * @params eoa, preFundAmt, chain, apiKey
    //  * eoa - ethers.Wallet object (user's eoa account)
    //  * preFundAmt - amount to prefund the wallet with, in eth/avax
    //  * chain - id of chain fun wallet is to be deployed on 
    //  * apiKey - apikey of org
    constructor(eoa, prefundAmt, chain, apiKey) {
        this.eoa = eoa
        // this.schema = schema
        this.prefundAmt = prefundAmt
        this.chain = chain
        this.apiKey = apiKey
    }

}



module.exports = { TestAaveConfig, FunWalletConfig }