const ethers = require("ethers")
const { Enum } = require('./Enum');
const { DataServer } = require("./DataServer")


const TokenTypesData = [
    "ETH",
    "ERC20",
]

const TokenTypes = new Enum(TokenTypesData)

class Token {

    constructor(data, chainId) {
        if (!(data && chainId)) {
            throw Error("Must specify address or symbol and chainId")
        }

        if (this.address) {
            this.type = TokenTypes.ERC20
        }

        if (ethers.utils.isAddress(data)) {
            this.address = data
        } else {
            this.symbol = data
            if (this.symbol == "eth") {
                this.type = TokenTypes.ETH
            }
        }

        chainId = typeof chainId == "string" ? chainId : chainId.toString()
        this.chainId = chainId == "31337" ? "1" : chainId
    }

    async getAddress() {
        if (this.address) {
            return this.address;
        }
        let tokenInfo;
        if (this.type == TokenTypes.ETH) {
            tokenInfo = await DataServer.getTokenInfo("weth", this.chainId)
        } else if (this.symbol && this.chainId) {
            tokenInfo = await DataServer.getTokenInfo(this.symbol, this.chainId)
        }

        if (tokenInfo.contract_address) {
            return tokenInfo.contract_address
        }

        throw Error("Token is not found")
    }
}

module.exports = {
    Token,
    TokenTypes
}
