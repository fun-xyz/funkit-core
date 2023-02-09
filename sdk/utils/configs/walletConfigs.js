const { USDCPaymaster } = require("../../src/paymasters/USDCPaymaster")


class TestAaveConfig {
    constructor(aTokenAddress, privKey, prefundAmt, APIKEY) {
        this.aTokenAddress = aTokenAddress
        this.privKey = privKey
        this.prefundAmt = prefundAmt
        this.APIKEY = APIKEY
    }
}

class FunWalletConfig {
    constructor(eoa, prefundAmt, chain, apiKey, userId = "fun", paymasterAddr = "", index = 0) {
        this.eoa = eoa
        this.prefundAmt = prefundAmt
        this.chain = chain
        this.apiKey = apiKey
        this.userId = userId
        this.index = index
        this.paymasterAddr = paymasterAddr
    }
}





module.exports = { TestAaveConfig, FunWalletConfig }