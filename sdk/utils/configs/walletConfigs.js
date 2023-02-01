
class TestAaveConfig {
    constructor(aTokenAddress, privKey, prefundAmt, APIKEY) {
        this.aTokenAddress = aTokenAddress
        this.privKey = privKey
        this.prefundAmt = prefundAmt
        this.APIKEY = APIKEY
    }
}

class FunWalletConfig {
    constructor(eoa, prefundAmt, chain, apiKey) {
        this.eoa = eoa
        // this.schema = schema
        this.prefundAmt = prefundAmt
        this.chain = chain
        this.apiKey = apiKey
    }

}



module.exports = { TestAaveConfig, FunWalletConfig }