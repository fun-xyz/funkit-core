
const { parseEther, Interface } = require("ethers/lib/utils")


/**
 * The PaymasterInterface class provides an interface to interact with the Paymaster smart contracts.
 * Currently, each call to a this.interface method is an EVM transaction.
 */
class PaymasterInterface {
    constructor() {
    }


    // token specific

    async addTokenDepositTo(account, amount) {
        const txData = await this.interface.encodeFunctionData("addTokenDepositTo", [account, amount])
        return txData
    }

    async withdrawTokenDepositTo(target, amount) {
        const txData = await this.interface.encodeFunctionData("withdrawTokenDepositTo", [account, amount])
        return txData
    }

    // eth specific

    async addEthDepositForSponsor(value, sponsor = this.eoaAddress) {
        const amount = parseEther(value.toString())
        const depositData = await this.interface.encodeFunctionData.addEthDepositForSponsor(sponsor, amount)
        const txData = { ...depositData, value: amount }
        return txData
    }

    async withdrawEthDepositTo(target, amount) {
        const txData = await this.interface.encodeFunctionData.withdrawEthDepositTo(target, amount)
        return txData
    }


    // WHITELIST OPERATION

    async _setWhitelistMode(mode) {
        await this.init()
        const txData = await this.interface.encodeFunctionData.setWhitelistMode(mode)
        return txData
    }
    async setSpenderBlackListMode(spender, mode) {
        const txData = await this.interface.encodeFunctionData.setSpenderBlackListMode(spender, mode)
        return txData

    }
    async setSpenderWhiteListMode(spender, isWhiteListed) {
        const txData = await this.interface.encodeFunctionData.setSpenderWhiteListMode(spender, isWhiteListed)
        return txData
    }



    // LOCK/UNLOCK BLOCKs

    //token specific
    async unlockTokenDeposit() {
        const txData = await this.interface.encodeFunctionData.unlockTokenDeposit()
        return txData
    }
    async lockTokenDeposit() {
        const txData = await this.interface.encodeFunctionData.lockTokenDeposit()
        return txData
    }

    //eth specific
    async lockSponsorEntrypointStake() {
        const txData = await this.interface.encodeFunctionData.lockSponsorEntrypointStake();
        return txData
    }

    async unlockSponsorEntrypointStakeAfter(blockNum) {
        const txData = await this.interface.encodeFunctionData.unlockSponsorEntrypointStakeAfter(blockNum);
        return txData
    }
}

module.exports = { PaymasterInterface }