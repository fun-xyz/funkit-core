const { ParameterFormatError, Helper } = require("../errors");
const { DataServer } = require("../servers");
const { parseOptions } = require("../utils");


const supportedTokens = ["usdc"]

class TokenSponsor {
    constructor(params) {
        const { sponsorAddress, token } = params
        this.sponsorAddress = sponsorAddress ? sponsorAddress : options.gasSponsor.sponsorAddress
        this.token = token ? token : options.gasSponsor.token

        if (!supportedTokens.includes(this.token)) {
            const helper = new Helper("GasSponsor: ", gasSponsor.token, "Token is not Supported")
            throw new ParameterFormatError(location, helper)
        }
    }

    async _getPaymasterAddress(options) {
        const chainId = await options.chain.getChainId()
        if (!this.paymasterAddress && chainId != this.chainId) {
            this.paymasterAddress = await DataServer.getPaymasterAddress(chainId)
            this.chainId = chainId
        }
        return this.paymasterAddress
    }

    async getPaymasterAndData(options = global) {
        const parsedOptions = await parseOptions(options)
        return await this._getPaymasterAddress(parsedOptions) + this.sponsorAddress.slice(2);
    }

    async changeSponsor(sponsorAddress) {
        this.sponsorAddress = sponsorAddress
    }
}


module.exports = { TokenSponsor };
