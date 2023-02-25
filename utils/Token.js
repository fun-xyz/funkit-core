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
    },
    "5": {
        weth: "0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6"
    },
    "43113": {
        weth: "0x1D308089a2D1Ced3f1Ce36B1FcaF815b07217be3"
    }
}

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
        const { type, address, name, chainId } = data

        if (type == TokenTypes.ETH) {
            if (ethers.utils.isAddress(address)) {
                return new Token(data)
            }
            if (!chainId) {
                throw Error("Chain does not exist")
            }

            if (!(tokens[chainId] && tokens[chainId].weth)) {
                throw Error("Weth address does not stored on chainId: ", chainId)
            }

            const wethAddress = tokens[chainId].weth;
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
}





module.exports = {
    Token,
    TokenTypes
}


