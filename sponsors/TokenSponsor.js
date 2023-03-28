const { Contract } = require("ethers");
const { Interface } = require("ethers/lib/utils");
const { Token } = require("../data");
const { ParameterFormatError, Helper } = require("../errors");
const { DataServer } = require("../servers");
const { parseOptions } = require("../utils/option");

const paymasterAbi = require("../abis/TokenPaymaster.json").abi


const supportedTokens = ["usdc", "dai"]

class TokenSponsor {
    constructor(options = global) {
        this.sponsorAddress = options.gasSponsor.sponsorAddress.toLowerCase()
        this.token = options.gasSponsor.token
        if (!supportedTokens.includes(this.token)) {
            const helper = new Helper("GasSponsor: ", gasSponsor.token, "Token is not Supported")
            throw new ParameterFormatError(location, helper)
        }

        this.interface = new Interface(paymasterAbi)

    }

    async getPaymasterAddress(options = global) {
        const parsedOptions = await parseOptions(options)

        const chainId = await parsedOptions.chain.getChainId()
        if (!this.paymasterAddress && chainId != this.chainId) {
            this.paymasterAddress = await DataServer.getPaymasterAddress(chainId)
            this.chainId = chainId
        }
        return this.paymasterAddress
    }

    async getPaymasterAndData(options = global) {
        return await this.getPaymasterAddress(options) + this.sponsorAddress.slice(2);
    }

    async changeSponsor(sponsorAddress) {
        this.sponsorAddress = sponsorAddress
    }

    async encode(data, options = global) {
        const to = await this.getPaymasterAddress(options)
        return { to, data, chain: options.chain }
    }

    async encodeValue(data, value, options = global) {
        const to = await this.getPaymasterAddress(options)
        return { to, value, data, chain: options.chain }
    }

    async getDepositInfo(address, options = global) {
        const parsedOptions = await parseOptions(options)
        const provider = await parsedOptions.chain.getProvider()
        const paymasterAddress = await this.getPaymasterAddress(parsedOptions)
        const contract = new Contract(paymasterAddress, paymasterAbi, provider)
        return contract.depositInfo(address)
    }

    async getTokenAmount(amount, options = global) {
        return await Token.getDecimalAmount(this.token, amount, options)
    }

    // interaction

    async addWalletToWhitelist(walletAddress) {
        return async (options = global) => {
            const data = this.interface.encodeFunctionData("setSpenderWhiteListMode", [walletAddress, true])
            return await this.encode(data, options)
        }
    }

    async removeWalletFromWhitelist(walletAddress) {
        return async (options = global) => {
            const data = this.interface.encodeFunctionData("setSpenderWhiteListMode", [walletAddress, false])
            return await this.encode(data, options)
        }
    }

    async addWalletToBlacklist(walletAddress) {
        return async (options = global) => {
            const data = this.interface.encodeFunctionData("setSpenderBlackListMode", [walletAddress, true])
            return await this.encode(data, options)
        }
    }
    async removeWalletFromBlacklist(walletAddress) {
        return async (options = global) => {
            const data = this.interface.encodeFunctionData("setSpenderBlackListMode", [walletAddress, false])
            return await this.encode(data, options)
        }
    }

    async setWhitelistMode() {
        return async (options = global) => {
            const data = this.interface.encodeFunctionData("setWhitelistMode", [true])
            return await this.encode(data, options)
        }
    }
    async setBlacklistMode() {
        return async (options = global) => {
            const data = this.interface.encodeFunctionData("setWhitelistMode", [false])
            return await this.encode(data, options)
        }
    }

    async stake(walletAddress, amount) {
        return async (options = global) => {
            const amountdec = await Token.getDecimalAmount("eth", amount, options)
            const data = this.interface.encodeFunctionData("addEthDepositForSponsor", [walletAddress, amountdec])
            return await this.encodeValue(data, amountdec, options)
        }
    }
    async unstake(walletAddress, amount) {
        return async (options = global) => {
            const amountdec = await Token.getDecimalAmount("eth", amount, options)
            const data = this.interface.encodeFunctionData("withdrawEthDepositTo", [walletAddress, amountdec])
            return await this.encode(data, options)
        }
    }

    async stakeToken(walletAddress, amount) {
        return async (options = global) => {
            const amountdec = await this.getTokenAmount(amount, options)
            const data = this.interface.encodeFunctionData("addTokenDepositTo", [walletAddress, amountdec])
            return await this.encode(data, options)
        }
    }

    async unstakeToken(walletAddress, amount) {
        return async (options = global) => {
            const amountdec = await this.getTokenAmount(amount, options)
            const data = this.interface.encodeFunctionData("withdrawTokenDepositTo", [walletAddress, amountdec])
            return await this.encode(data, options)
        }
    }

    async approve(amount) {
        return async (options = global) => {
            const gasSponsorAddress = await this.getPaymasterAddress(options)
            return await Token.approve(this.token, gasSponsorAddress, amount)
        }
    }
}


module.exports = { TokenSponsor };
