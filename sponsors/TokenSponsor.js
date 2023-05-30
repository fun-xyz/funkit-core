const { Contract, constants } = require("ethers");
const { Interface } = require("ethers/lib/utils");
const { Token } = require("../data");
const { DataServer } = require("../servers");
const { parseOptions } = require("../utils/option");

const paymasterAbi = require("../abis/TokenPaymaster.json").abi

class TokenSponsor {
    constructor(options = global) {
        this.sponsorAddress = options.gasSponsor.sponsorAddress
        this.token = options.gasSponsor.token.toLowerCase()
        this.interface = new Interface(paymasterAbi)
    }

    async getPaymasterAddress(options = global) {
        const parsedOptions = await parseOptions(options)
        const chainId = await parsedOptions.chain.getChainId()
        if (!this.paymasterAddress && chainId != this.chainId) {
            this.paymasterAddress = await parsedOptions.chain.getAddress("tokenSponsorAddress")
            this.chainId = chainId
        }
        return this.paymasterAddress
    }

    async getPaymasterAndData(options = global) {
        const tokenAddress = await Token.getAddress(this.token, options)
        return await this.getPaymasterAddress(options) + this.sponsorAddress.slice(2) + tokenAddress.slice(2);
    }

    async getTokenInfo(token, options = global) {
        const contract = await this.getContract(options)
        const tokenAddress = await Token.getAddress(token, options)
        return await contract.getToken(tokenAddress)
    }

    async getTokenBalance(token, spender, options = global) {
        const contract = await this.getContract(options)
        const tokenData = new Token(token)
        let tokenAddress;
        if (tokenData.isNative) {
            tokenAddress = constants.AddressZero
        } else {
            tokenAddress = await tokenData.getAddress(options)
        }
        return await contract.getTokenBalance(tokenAddress, spender)
    }

    async getListMode(spender, options = global) {
        const contract = await this.getContract(options)
        return await contract.getListMode(spender)
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

    async encode(data, options = global) {
        const to = await this.getPaymasterAddress(options)
        return { to, data, chain: options.chain }
    }

    async encodeValue(data, value, options = global) {
        const to = await this.getPaymasterAddress(options)
        return { to, value, data, chain: options.chain }
    }

    async getSpenderBlacklisted(spender, options = global) {
        const contract = await this.getContract(options)
        return await contract.getSpenderBlacklisted(spender)
    }

    async getSpenderWhitelisted(spender, options = global) {
        const contract = await this.getContract(options)
        return await contract.getSpenderWhitelisted(spender)
    }

    async getTokenWhitelisted(spender, options = global) {
        const contract = await this.getContract(options)
        return await contract.getTokenWhitelisted(spender)
    }

    async getTokenBlacklisted(spender, options = global) {
        const contract = await this.getContract(options)
        return await contract.getTokenBlacklisted(spender)
    }

    addUsableToken(oracle, token, aggregator) {
        return async (options = global) => {
            const decimals = await Token.getDecimals(token, options)
            const tokenAddress = await Token.getAddress(token, options)
            const data = [oracle, tokenAddress, decimals, aggregator]
            const calldata = this.interface.encodeFunctionData("setTokenData", [data])
            return await this.encode(calldata, options)
        }
    }

    stake(walletAddress, amount) {
        return async (options = global) => {
            const amountdec = await Token.getDecimalAmount("eth", amount, options)
            const data = this.interface.encodeFunctionData("addEthDepositTo", [walletAddress, amountdec])
            return await this.encodeValue(data, amountdec, options)
        }
    }

    unstake(walletAddress, amount) {
        return async (options = global) => {
            const amountdec = await Token.getDecimalAmount("eth", amount, options)
            const data = this.interface.encodeFunctionData("withdrawEthDepositTo", [walletAddress, amountdec])
            return await this.encode(data, options)
        }
    }

    stakeToken(token, walletAddress, amount) {
        return async (options = global) => {
            const tokenObj = new Token(token)

            const tokenAddress = await tokenObj.getAddress(options)
            const amountdec = await tokenObj.getDecimalAmount(amount, options)

            const data = this.interface.encodeFunctionData("addTokenDepositTo", [tokenAddress, walletAddress, amountdec])
            return await this.encode(data, options)
        }
    }

    unstakeToken(token, walletAddress, amount) {
        return async (options = global) => {
            const tokenObj = new Token(token)

            const tokenAddress = await tokenObj.getAddress(options)
            const amountdec = await tokenObj.getDecimalAmount(amount, options)

            const data = this.interface.encodeFunctionData("withdrawTokenDepositTo", [tokenAddress, walletAddress, amountdec])
            return await this.encode(data, options)
        }
    }

    setToBlacklistMode() {
        return async (options = global) => {
            const data = this.interface.encodeFunctionData("setListMode", [true])
            return await this.encode(data, options)
        }
    }

    setToWhitelistMode() {
        return async (options = global) => {
            const data = this.interface.encodeFunctionData("setListMode", [false])
            return await this.encode(data, options)
        }
    }

    addWhitelistTokens(tokens) {
        return async (options = global) => {
            const sendTokens = await Promise.all(tokens.map(token => {
                return Token.getAddress(token, options)
            }))
            const data = this.interface.encodeFunctionData("addTokens", [sendTokens])
            return await this.encode(data, options)
        }
    }

    removeWhitelistTokens(tokens) {
        return async (options = global) => {
            const sendTokens = await Promise.all(tokens.map(token => {
                return Token.getAddress(token, options)
            }))
            const data = this.interface.encodeFunctionData("removeTokens", [sendTokens])
            return await this.encode(data, options)
        }
    }

    addSpenderToWhiteList(spender) {
        return async (options = global) => {
            const data = this.interface.encodeFunctionData("setSpenderWhitelistMode", [spender, true])
            return await this.encode(data, options)
        }
    }

    removeSpenderFromWhiteList(spender) {
        return async (options = global) => {
            const data = this.interface.encodeFunctionData("setSpenderWhitelistMode", [spender, false])
            return await this.encode(data, options)
        }
    }

    addSpenderToBlackList(spender) {
        return async (options = global) => {
            const data = this.interface.encodeFunctionData("setSpenderBlacklistMode", [spender, true])
            return await this.encode(data, options)
        }
    }

    removeSpenderFromBlackList(spender) {
        return async (options = global) => {
            const data = this.interface.encodeFunctionData("setSpenderBlacklistMode", [spender, false])
            return await this.encode(data, options)
        }
    }

    lockTokenDeposit(token) {
        return async (options = global) => {
            const data = this.interface.encodeFunctionData("lockTokenDeposit", [token])
            return await this.encode(data, options)
        }
    }

    unlockTokenDepositAfter(token, blocksToWait) {
        return async (options = global) => {
            const data = this.interface.encodeFunctionData("unlockTokenDepositAfter", [token, blocksToWait])
            return await this.encode(data, options)
        }
    }

    approve(token, amount) {
        return async (options = global) => {
            const gasSponsorAddress = await this.getPaymasterAddress(options)
            return await Token.approve(token, gasSponsorAddress, amount)
        }
    }

    addTokenToBlackList(token) {
        return async (options = global) => {
            const tokenAddress = await Token.getAddress(token, options)
            const data = this.interface.encodeFunctionData("setTokenBlacklistMode", [tokenAddress, true])
            return await this.encode(data, options)
        }
    }

    setTokenBlackListMode() {
        return async (options = global) => {
            const data = this.interface.encodeFunctionData("setTokenListMode", [true])
            return await this.encode(data, options)
        }
    }

    setTokenWhiteListMode() {
        return async (options = global) => {
            const data = this.interface.encodeFunctionData("setTokenListMode", [false])
            return await this.encode(data, options)
        }
    }

    removeTokenFromBlackList(token) {
        return async (options = global) => {
            const tokenAddress = await Token.getAddress(token, options)
            const data = this.interface.encodeFunctionData("setTokenBlacklistMode", [tokenAddress, false])
            return await this.encode(data, options)
        }
    }

    batchBlacklistTokens(tokens, modes) {
        return async (options = global) => {
            let calldata = []
            for (let i = 0; i < tokens.length; i++) {
                const tokenAddress = await Token.getAddress(tokens[i], options)
                calldata.push(this.interface.encodeFunctionData("setTokenBlacklistMode", [tokenAddress, modes[i]]))
            }
            const data = this.interface.encodeFunctionData("batchActions", [calldata])
            return await this.encode(data, options)
        }
    }

    batchWhitelistTokens(tokens, modes) {
        return async (options = global) => {
            let calldata = []
            for (let i = 0; i < tokens.length; i++) {
                const tokenAddress = await Token.getAddress(tokens[i], options)
                calldata.push(this.interface.encodeFunctionData("setTokenWhitelistMode", [tokenAddress, modes[i]]))
            }
            const data = this.interface.encodeFunctionData("batchActions", [calldata])
            return await this.encode(data, options)
        }
    }

    batchBlacklistUsers(users, modes) {
        return async (options = global) => {
            let calldata = []
            for (let i = 0; i < users.length; i++) {
                calldata.push(this.interface.encodeFunctionData("setSpenderBlacklistMode", [users[i], modes[i]]))
            }
            const data = this.interface.encodeFunctionData("batchActions", [calldata])
            return await this.encode(data, options)
        }
    }

    batchWhitelistUsers(users, modes) {
        return async (options = global) => {
            let calldata = []
            for (let i = 0; i < users.length; i++) {
                calldata.push(this.interface.encodeFunctionData("setSpenderWhitelistMode", [users[i], modes[i]]))
            }
            const data = this.interface.encodeFunctionData("batchActions", [calldata])
            return await this.encode(data, options)
        }
    }

}

module.exports = { TokenSponsor };