const { DataServer } = require("../../utils/DataServer");
const { BasePaymaster } = require("./BasePaymaster");

/**
 * Token Paymaster is a Paymaster allowing for the payment of gas in the ERC-20 token, USDC.
 */

class TokenPaymaster extends BasePaymaster {
    constructor(sponsorAddress, chainId, token = "usdc") {
        super()
        this.sponsorAddress = sponsorAddress
        this.chainId = chainId
        this.token = token;
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

    async _changeChain(chainId) {
        this.chainId = chainId
        this.paymasterAddress = await DataServer.getPaymasterAddress(this.chainId)
    }
}

module.exports = { TokenPaymaster }