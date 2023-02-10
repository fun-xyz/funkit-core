const { PaymasterDataProvider } = require("../../utils/PaymasterDataProvider");

const USDCPaymasterContractData = require("../../utils/abis/TokenPaymaster.json");
const { ethers } = require("ethers");

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