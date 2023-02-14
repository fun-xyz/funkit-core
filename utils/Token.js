const ethers = require("ethers")
const { Enum } = require('./Enum');
const { DataServer } = require("./DataServer")


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
const defaultChain = "1"

class Token {

    constructor(config) {
        if (config.type && !TokenTypesData[config.type]) {
            throw Error("Type is not a token");
        }

        this.type = config.type
        this.address = config.address
        this.name = config.name
        this.chain = config.chain ? config.chain : "1"
    }

    async getAddress() {
        if (this.address) {
            return this.address;
        }
        if (this.type == TokenTypes.ETH) {
            return tokens[this.chain].weth
        }

        if (this.name) {
            return tokens[this.chain][this.name]
        }
    }

    static async callServerForKeyCheck(data) {
        if (!data) {
            return false
        }
        let info = await DataServer.getTokenInfo(data.toLowerCase())
        let outAddress = info[0].detail_platforms.ethereum
        if (outAddress) {
            return new Token({ address: outAddress.contract_address });
        }
        return false
    }

    static async handleStringArgs(data) {
        if (data == "eth") {
            return new Token({ type: TokenTypes.ETH })
        }
        if (ethers.utils.isAddress(data)) {
            return new Token({ address: data })
        }
        let serverToken = await this.callServerForKeyCheck(data)
        if (serverToken != false) {
            return serverToken
        }
        throw Error("token does not exist")
    }

    static async handleObjectArgs(data) {
        const { type, address, name, chain } = data

        if (type == TokenTypes.ETH) {
            if (ethers.utils.isAddress(address)) {
                return new Token(data)
            }
            if (!chain) {
                throw Error("Chain does not exist")
            }

            if (!(tokens[chain] && tokens[chain].weth)) {
                throw Error("Weth address does not stored on chain: ", chain)
            }

            const wethAddress = tokens[chain].weth;
            return new Token({ ...data, address: wethAddress, })
        }

        let serverData;

        serverData = await this.callServerForKeyCheck(name)

        if (serverData != false) {
            return serverData
        }

        if (!address) {
            throw Error("Token does not exist.")
        }
        if (!ethers.utils.isAddress(address)) {
            throw Error("incorrect address formatting")
        }
        return new Token(data);
    }

    static async createFrom(data) {
        switch (typeof data) {
            case "string": {
                return await this.handleStringArgs(data)
            }
            case "object": {
                return await this.handleObjectArgs(data)
            }
            default: {
                throw Error("data is not a token")
            }
        }
    }

    static async getAddressFrom(data) {
        const { address } = await this.createFrom(data)
        return address
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
    TokenTypes,
    defaults,
}


