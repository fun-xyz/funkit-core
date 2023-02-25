const ethers = require("ethers")
const { Enum } = require('./Enum');
const { DataServer, tokens } = require("./DataServer")


const TokenTypesData = [
    "ETH",
    "ERC20",
]

const TokenTypes = new Enum(TokenTypesData)



const defaultChain = "1"

class Token {

    constructor(config) {
        if (config.type && !TokenTypesData[config.type]) {
            throw Error("Type is not a token");
        }
        this.type = config.type
        if (!((config.address || config.symbol) && config.chainId)) {
            throw Error("Must specify address or symbol and chainId")
        }


        if (this.address) {
            this.type = TokenTypes.ERC20
        }
        this.address = config.address
        this.symbol = config.symbol
        if (this.symbol == "eth") {
            this.type = TokenTypes.ETH
        }

        config.chainId = typeof config.chainId == "string" ? config.chainId : config.chainId.toString()
        this.chainId = config.chainId ? config.chainId : "1"
        this.chainId = config.chainId == "31337" ? "1" : config.chainId

    }

    async getAddress() {
        if (this.address) {
            return this.address;
        }
        if (this.type == TokenTypes.ETH) {
            return tokens[this.chainId].weth
        }
        if (this.symbol && this.chainId) {
            let tokenInfo = await DataServer.getTokenInfo(this.symbol, this.chainId)
            return tokenInfo.contract_address
        }
        throw Error("Token is not found")
    }

}





module.exports = {
    Token,
    TokenTypes
}


