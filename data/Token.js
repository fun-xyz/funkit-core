const ethers = require("ethers")
const { MissingParameterError } = require("../errors")
const { DataServer } = require("../servers")
const { verifyValidParametersForLocation } = require("../utils/data")
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

        if (nativeTokens.includes(this.symbol)) {
            this.isNative = true
        }
        this.symbol = data
    }

    async getAddress(options = global) {
        const parseOptions = await parseOptions(options)
        const chainId = await parseOptions.chain.getChainId()
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
        const parseOptions = await parseOptions(options)
        if (this.contract) {
            const provider = await parseOptions.chain.getProvider()
            const addr = await this.getAddress()
            this.contract = new ethers.Contract(addr, erc20Abi, provider)
        }
        return this.contract
    }
    async getDecimals(options = global) {
        const parseOptions = await parseOptions(options)
        const contract = await this.getContract(parseOptions)
        return await contract.decimals()
    }

    static async getAddress(data, options = global) {
        const parseOptions = await parseOptions(options)
        const token = new Token(data)
        return await token.getAddress(parseOptions)
    }

    static async getDecimals(data, options = global) {
        const parseOptions = await parseOptions(options)
        const token = new Token(data)
        return await token.getDecimals(parseOptions)
    }
}

module.exports = {
    Token,
}
