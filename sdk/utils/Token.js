const { Enum } = require('./Enum');

const TokenTypesData = [
    "ETH",
    "ERC20",
]

const TokenTypes = new Enum(TokenTypesData)

const tokens = {
    "1": {
        weth: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
        usdc: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        dai: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
        usdt: "0xA02f6adc7926efeBBd59Fd43A84f4E0c0c91e832",
    }

}

class Token {
    constructor(config) {
        if (!TokenEnum[config.type]) {
            throw Error("Type is not a token");
        }

        this.type = config.type
        this.address = config.address
        this.name = config.name
        this.chain = config.chain
    }

    async getAddress() {
        if (this.type == TokenTypes.ETH) {
            return tokens[this.chain].weth
        }

        if (this.name) {
            return tokens[this.chain][this.name]
        }
    }

    static createFrom(data) {
        switch (typeof data) {
            case "string": {

            }
            case "object": {
                if (data.address) { }
            }
        }
    }
}
const eth = new Token({ type: TokenTypes.ETH })
const usdc = new Token({ type: TokenTypes.ERC20, name: "usdc" })
const dai = new Token({ type: TokenTypes.ERC20, name: "dai" })
const usdt = new Token({ type: TokenTypes.ERC20, name: "usdt" })




const defaults = {
    eth,
    usdc,
    dai,
    usdt,
}

module.exports = {
    Token,
    TokenTypes
}
