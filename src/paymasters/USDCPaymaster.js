const { BasePaymaster } = require("./BasePaymaster");

class USDCPaymaster extends BasePaymaster {

    constructor(paymasterAddr, sponsorAddress) {
        super()
        this.paymasterAddr = paymasterAddr
        this.sponsorAddress = sponsorAddress
    }

    async getPaymasterAndData() {
        return this.paymasterAddr + this.sponsorAddress.slice(2);
    }
}

module.exports = { USDCPaymaster }