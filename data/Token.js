const ethers = require("ethers")
const { parseUnits, formatUnits } = require("ethers/lib/utils")
const { MissingParameterError, TransactionError, Helper } = require("../errors")
const { DataServer } = require("../servers")
const { parseOptions } = require("../utils/option")
const erc20Abi = require("../abis/ERC20.json").abi

const nativeTokens = ["eth", "matic"]

class Token {
    constructor(data, location = "Token constructor") {
        if (!data) {
            throw new MissingParameterError(location)
        }
        if (ethers.utils.isAddress(data)) {
            this.address = data
            return;
        }

        if (nativeTokens.includes(data.toLowerCase())) {
            this.isNative = true
        }
        this.symbol = data
    }

    async getAddress(options = global) {
        const parsedOptions = await parseOptions(options, "Token.getAddress")
        const chainId = await parsedOptions.chain.getChainId()
        if (this.address) {
            return this.address;
        }
        let tokenInfo;
        if (this.isNative) {
            tokenInfo = await DataServer.getTokenInfo("weth", chainId)
        } else if (this.symbol) {
            tokenInfo = await DataServer.getTokenInfo(this.symbol, chainId)
        }
        return tokenInfo
    }

    async getContract(options = global) {
        const parsedOptions = await parseOptions(options)
        if (!this.contract) {
            const provider = await parsedOptions.chain.getProvider()
            const addr = await this.getAddress()
            this.contract = new ethers.Contract(addr, erc20Abi, provider)
        }
        return this.contract
    }


    async getDecimals(options = global) {
        if (this.isNative) {
            return 18
        }
        const parsedOptions = await parseOptions(options)
        const contract = await this.getContract(parsedOptions)
        return await contract.decimals()
    }

    async getBalance(address, options = global) {
        const parsedOptions = await parseOptions(options)
        const contract = await this.getContract(parsedOptions)
        let amount;
        if (this.isNative) {
            const provider = await parsedOptions.chain.getProvider()
            amount = await provider.getBalance(address)
        } else {
            amount = await contract.balanceOf(address)
        }
        const decimals = await this.getDecimals(parsedOptions)
        return formatUnits(amount, decimals)
    }

    async getApproval(owner, spender, options = global) {
        if (this.isNative) {
            const helper = new Helper("approval", this, "Native token can not approve")
            throw new TransactionError("Token.getApproval")
        }
        const parsedOptions = await parseOptions(options)
        const contract = await this.getContract(parsedOptions)
        return await contract.allowance(owner, spender)
    }

    async getDecimalAmount(amount, options = global) {
        const decimals = await this.getDecimals(options)
        return parseUnits(`${amount}`, decimals)
    }

    async approve(spender, amount, options = global) {
        const parsedOptions = await parseOptions(options)
        const contract = await this.getContract(parsedOptions)
        const amountDec = await this.getDecimalAmount(amount)
        const data = await contract.populateTransaction.approve(spender, amountDec)
        return { ...data, chain: parsedOptions.chain }
    }

    async transfer(spender, amount, options = global) {
        const parsedOptions = await parseOptions(options)
        const contract = await this.getContract(parsedOptions)
        const amountDec = await this.getDecimalAmount(amount)
        const data = await contract.populateTransaction.transfer(spender, amountDec)
        return { ...data, chain: parsedOptions.chain }
    }

    static async getAddress(data, options = global) {
        const token = new Token(data)
        return await token.getAddress(options)
    }

    static async getDecimals(data, options = global) {
        const token = new Token(data)
        return await token.getDecimals(options)
    }

    static async getBalance(data, address, options = global) {
        const token = new Token(data)
        return await token.getBalance(address, options)
    }

    static async getApproval(data, owner, spender, options = global) {
        const token = new Token(data)
        return await token.getApproval(owner, spender, options)
    }
    static async getDecimalAmount(data, amount, options = global) {
        const token = new Token(data)
        return await token.getDecimalAmount(amount, options)
    }

    static async approve(data, spender, amount, options = global) {
        const token = new Token(data)
        return await token.approve(spender, amount, options)
    }

    static async transfer(data, spender, amount, options = global) {
        const token = new Token(data)
        return await token.transfer(spender, amount, options)
    }
}

module.exports = {
    Token,
}