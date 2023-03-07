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

    addWallet
    removeWallet
    setWhitelistMode
    setBlacklistMode
    stakeEth
    unstakeEth
    stakeToken
    unstakeToken
    deploy

}

module.exports = { TokenPaymaster }