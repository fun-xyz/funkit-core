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
    constructor(eoa, chain, apiKey, prefundAmt, userId = "fun", index = 0) {
        this.eoa = eoa
        this.prefundAmt = prefundAmt
        this.chain = chain
        this.apiKey = apiKey
        this.userId = userId
        this.index = index
    }
}

class WalletWithPaymasterConfig extends FunWalletConfig {
    constructor(paymasterAddr, eoa, chain, apiKey, prefundAmt, userId = "fun", index = 0) {
        super(eoa, chain, apiKey, prefundAmt, userId, index)
        this.paymasterAddr = paymasterAddr
    }
}

class WalletWithUSDCPaymasterConfig extends WalletWithPaymasterConfig {
    constructor(paymasterAddr, eoa, chain, apiKey, prefundAmt, userId = "fun", index = 0) {
        super(paymasterAddr, eoa, chain, apiKey, prefundAmt, userId, index)
        this.paymaster = new USDCPaymaster(config.paymasterAddr)
    }
}



module.exports = { TestAaveConfig, FunWalletConfig, WalletWithPaymasterConfig, WalletWithUSDCPaymasterConfig }