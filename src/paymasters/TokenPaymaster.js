const { BasePaymaster } = require("./BasePaymaster");

/**
 * USDC Paymaster is a Paymaster allowing for the payment of gas in the ERC-20 token, USDC.
 */
class TokenPaymaster extends BasePaymaster {

    constructor(paymasterAddr, sponsorAddress) {
        super()
        this.paymasterAddr = paymasterAddr
        this.sponsorAddress = sponsorAddress
    }

    async getPaymasterAndData() {
        return this.paymasterAddr + this.sponsorAddress.slice(2);
    }

    async changeSponsor(sponsorAddress) {
        this.sponsorAddress = sponsorAddress

    }

    async addWallet(walletAddress) { }
    async removeWallet(walletAddress) { }
    async setWhitelistMode() { }
    async setBlacklistMode() { }
    async stakeEth() { }
    async unstakeEth() { }
    async stakeToken(walletAddress, amount, token) { }
    async unstakeToken(walletAddress, amount, token) { }
    async deploy() { }

}

module.exports = { TokenPaymaster }