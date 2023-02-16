const { BasePaymaster } = require("./BasePaymaster");

class USDCPaymaster extends BasePaymaster {

    constructor(paymasterAddr) {
        super()
        this.paymasterAddr = paymasterAddr
    }

    async getPaymasterAndData() {
        return this.paymasterAddr;
    }
}

module.exports = { USDCPaymaster }