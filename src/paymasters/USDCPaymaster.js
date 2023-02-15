const { PaymasterDataProvider } = require("../../utils/PaymasterDataProvider");

class USDCPaymaster extends PaymasterDataProvider {

    constructor(paymasterAddr) {
        super()
        this.paymasterAddr = paymasterAddr
    }

    async getPaymasterAndData() {
        return this.paymasterAddr;
    }
}

module.exports = { USDCPaymaster }