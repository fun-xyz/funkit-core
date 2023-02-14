
class TestAaveConfig {
    constructor(aTokenAddress, privKey, prefundAmt, APIKEY) {
        this.aTokenAddress = aTokenAddress
        this.privKey = privKey
        this.prefundAmt = prefundAmt
        this.APIKEY = APIKEY
    }
}

module.exports = { TestAaveConfig }