const { PaymasterInterface } = require("./PaymasterInterface");

/**
 * USDC Paymaster is a Paymaster allowing for the payment of gas in the ERC-20 token, USDC.
 */

class PaymasterSponsor extends PaymasterInterface {
    constructor(eoa) {
        super(eoa)
    }

    async addWalletToWhitelist(walletAddress) {
        await this.setSponsorApproval(walletAddress, true)
    }
    async removeWalletFromWhitelist(walletAddress) {
        await this.setSponsorApproval(walletAddress, false)
    }

    async addWalletToBlacklist(walletAddress) {
        await this.setSpenderToBlackListMode(walletAddress, true)
    }
    async removeWalletFromBlacklist(walletAddress) {
        await this.setSpenderToBlackListMode(walletAddress, false)
    }

    async setWhitelistMode() {
        await this._setWhitelistMode(true)
    }
    async setBlacklistMode() {
        await this._setWhitelistMode(false)
    }

    async stakeEth(walletAddress, amount) {
        await this.addEthDepositForSponsor(amount, walletAddress)
    }
    async unstakeEth(walletAddress, amount) {
        await this.withdrawEthDepositTo(walletAddress, amount)
    }

    async stakeToken(walletAddress, amount) {
        await this.addTokenDepositTo(walletAddress, amount)
    }
    async unstakeToken(walletAddress, amount) {
        await this.withdrawTokenDepositTo(walletAddress, amount)
    }

}

module.exports = { PaymasterSponsor }