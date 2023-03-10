const { DataServer } = require("../../utils/DataServer");
const { BasePaymaster } = require("./BasePaymaster");
const { PaymasterInterface } = require("./PaymasterInterface");

/**
 * USDC Paymaster is a Paymaster allowing for the payment of gas in the ERC-20 token, USDC.
 */

class TokenPaymaster extends BasePaymaster {
    constructor(sponsorAddress, chainId) {
        super()
        this.sponsorAddress = sponsorAddress
        this.chainId = chainId
    }

    async _getPaymasterAddress() {
        if (!this.paymasterAddress) {
            this.paymasterAddress = await DataServer.getPaymasterAddress(this.chainId)
        }
        return this.paymasterAddress
    }

    async getPaymasterAndData() {
        return await this._getPaymasterAddress() + this.sponsorAddress.slice(2);
    }

    async changeSponsor(sponsorAddress) {
        this.sponsorAddress = sponsorAddress
    }

    async changeChain(chainId) {
        this.chainId = chainId
        this.paymasterAddress = await DataServer.getPaymasterAddress(this.chainId)
    }
}

module.exports = { TokenPaymaster }