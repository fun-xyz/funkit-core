const { PaymasterDataProvider } = require("../../utils/PaymasterDataProvider");

class USDCPaymaster extends PaymasterDataProvider {

    constructor(paymasterAddr) {
        super()
        this.paymasterAddr = paymasterAddr
    }

    loadProvider(provider) {
        // this.contract = new ethers.Contract(this.paymasterAddr, USDCPaymasterContractData.abi, provider)
    }

    async getPaymasterAndData() {
        return this.paymasterAddr;
    }
}

module.exports = { USDCPaymaster }