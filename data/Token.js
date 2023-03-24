const ethers = require("ethers")
const { MissingParameterError } = require("../errors")
const { DataServer } = require("../servers")
const { parseOptions } = require("../utils/option")
const erc20Abi = require("../abis/ERC20.json").abi

const nativeTokens = ["eth"]

class Token {
    constructor(data, location = "Token constructor") {
        if (!data) {
            throw new MissingParameterError(location)
        }
        if (ethers.utils.isAddress(data)) {
            this.address = data
            return;
        }

        if (nativeTokens.includes(data)) {
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
        const parsedOptions = await parseOptions(options)
        const contract = await this.getContract(parsedOptions)
        return await contract.decimals()
    }

    async getBalance(address, options = global) {
        const parsedOptions = await parseOptions(options)
        const contract = await this.getContract(parsedOptions)
        return await contract.balanceOf(address)
    }

    async getApproval(owner, spender, options = global) {
        const parsedOptions = await parseOptions(options)
        const contract = await this.getContract(parsedOptions)
        return await contract.allowance(owner, spender)
    }

    static async getAddress(data, options = global) {
        const parsedOptions = await parseOptions(options)
        const token = new Token(data)
        return await token.getAddress(parsedOptions)
    }

    static async getDecimals(data, options = global) {
        const parsedOptions = await parseOptions(options)
        const token = new Token(data)
        return await token.getDecimals(parsedOptions)
    }

    static async getBalance(data, address, options = global) {
        const parsedOptions = await parseOptions(options)
        const token = new Token(data)
        if (token.isNative) {
            const provider = await parsedOptions.chain.getProvider()
            return await provider.getBalance(address)
        }
        return await token.getBalance(address, parsedOptions)
    }

    static async getApproval(data, owner, spender, options = global) {
        const parsedOptions = await parseOptions(options)
        const token = new Token(data)
        return await token.getApproval(owner, spender, parsedOptions)
    }
}

module.exports = {
    Token,
}
