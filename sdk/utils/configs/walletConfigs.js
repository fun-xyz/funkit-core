
class TestAaveConfig {
    constructor(aTokenAddress, privKey, prefundAmt, APIKEY) {
        this.aTokenAddress = aTokenAddress
        this.privKey = privKey
        this.prefundAmt = prefundAmt
        this.APIKEY = APIKEY
    }
}

class FunWalletConfig {
    constructor(eoa, chain, apiKey, prefundAmt, userId = "fun", index = 0) {
        this.eoa = eoa
        this.prefundAmt = prefundAmt
        this.chain = chain
        this.apiKey = apiKey
        this.userId = userId
        this.index = index
    }

}



module.exports = { TestAaveConfig, FunWalletConfig }