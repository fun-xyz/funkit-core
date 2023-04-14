const { Contract } = require("ethers");
const { Interface } = require("ethers/lib/utils");
const { Token } = require("../data");
const { DataServer } = require("../servers");
const { parseOptions } = require("../utils/option");

const paymasterAbi = require("../abis/FeelessPaymaster.json").abi

class GaslessSponsor {
    constructor(options = global) {
        this.sponsorAddress = options.gasSponsor.sponsorAddress
        this.interface = new Interface(paymasterAbi)
    }

    async getPaymasterAddress(options = global) {
        // const parsedOptions = await parseOptions(options)
        // const chainId = await parsedOptions.chain.getChainId()
        // if (!this.paymasterAddress && chainId != this.chainId) {
        //     this.paymasterAddress = await DataServer.getPaymasterAddress(chainId)
        //     this.chainId = chainId
        // }
        // return this.paymasterAddress
        return require("../contracts.json").gaslessSponsor
    }

    async getPaymasterAndData(options = global) {
        return await this.getPaymasterAddress(options) + this.sponsorAddress.slice(2)
    }

    async getContract(options = global) {
        if (!this.contract) {
            const parsedOptions = await parseOptions(options)
            const provider = await parsedOptions.chain.getProvider()
            const paymasterAddress = await this.getPaymasterAddress(parsedOptions)
            this.contract = new Contract(paymasterAddress, paymasterAbi, provider)
        }
        return this.contract
    }

    async getBalance(sponsor, options = global) {
        const contract = await this.getContract(options)
        return await contract.getBalance(sponsor)
    }

    async encode(data, options = global) {
        const to = await this.getPaymasterAddress(options)
        return { to, data, chain: options.chain }
    }

    async encodeValue(data, value, options = global) {
        const to = await this.getPaymasterAddress(options)
        return { to, value, data, chain: options.chain }
    }

    async stake(walletAddress, amount) {
        return async (options = global) => {
            const amountdec = await Token.getDecimalAmount("eth", amount, options)
            const data = this.interface.encodeFunctionData("addDepositTo", [walletAddress, amountdec])
            return await this.encodeValue(data, amountdec, options)
        }
    }

    async unstake(walletAddress, amount) {
        return async (options = global) => {
            const amountdec = await Token.getDecimalAmount("eth", amount, options)
            const data = this.interface.encodeFunctionData("withdrawDepositTo", [walletAddress, amountdec])
            return await this.encode(data, options)
        }
    }

    async lock() {
        return async (options = global) => {
            const data = this.interface.encodeFunctionData("lockDeposit", [])
            return await this.encode(data, options)
        }
    }

    async unlock(num) {
        return async (options = global) => {
            const data = this.interface.encodeFunctionData("unlockDepositAfter", [num])
            return await this.encode(data, options)
        }
    }

    async setToBlacklistMode() {
        return async (options = global) => {
            const data = this.interface.encodeFunctionData("setListMode", [true])
            return await this.encode(data, options)
        }
    }

    async setToWhitelistMode() {
        return async (options = global) => {
            const data = this.interface.encodeFunctionData("setListMode", [false])
            return await this.encode(data, options)
        }
    }

    async addSpenderToWhiteList(spender) {
        return async (options = global) => {
            const data = this.interface.encodeFunctionData("setSpenderWhitelistMode", [spender, true])
            return await this.encode(data, options)
        }
    }
    async removeSpenderFromWhiteList(spender) {
        return async (options = global) => {
            const data = this.interface.encodeFunctionData("setSpenderWhitelistMode", [spender, false])
            return await this.encode(data, options)
        }
    }

    async addSpenderToBlackList(spender) {
        return async (options = global) => {
            const data = this.interface.encodeFunctionData("setSpenderBlacklistMode", [spender, true])
            return await this.encode(data, options)
        }
    }

    async removeSpenderFromBlackList(spender) {
        return async (options = global) => {
            const data = this.interface.encodeFunctionData("setSpenderBlacklistMode", [spender, false])
            return await this.encode(data, options)
        }
    }
}

module.exports = { GaslessSponsor };