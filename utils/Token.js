const { DataServer } = require("./DataServer")
const { Enum } = require('./Enum')

const TokenTypesData = [
    "ETH",
    "ERC20",
]
const TokenTypes = new Enum(TokenTypesData)

class Token {

    constructor(config) {
        if (config.type && !TokenTypesData[config.type]) {
            throw Error("Type is not a token");
        }

        if (!config.address && (!config.symbol || !config.chainId)) {
            throw Error("Must specify address or symbol and chainId") 
        }
        
        this.type = config.type
        this.address = config.address
        this.symbol = config.symbol
        this.chainId = config.chainId
    }

    async getAddress() {
        if (this.address) {
            return this.address;
        }
        
        let tokenInfo = await DataServer.getTokenInfo(this.symbol, this.chainId)
        return tokenInfo.contract_address
    }

    static async createToken(data) {
        const { type, address, symbol, chainId } = data
        if (address) {
            return new Token({type: type, address: address})
        } else {
            return new Token({type: type, symbol: symbol, chainId: chainId})
        }
    }
}

module.exports = { Token, TokenTypes }