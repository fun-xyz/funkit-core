const { ServerMissingDataError, Helper } = require('../errors')
const { FUN_TESTNET_CHAIN_ID } = require('../test/testUtils')
const { sendRequest } = require('../utils/network')
const { getPromiseFromOp } = require('../utils/userop')

const LOCAL_FORK_CHAIN_ID = 31337
const LOCAL_URL = "http://127.0.0.1:3000"
const LOCAL_FORK_CHAIN_KEY = "ethereum-localfork"
const APIURL = 'https://vyhjm494l3.execute-api.us-west-2.amazonaws.com/prod'
const TEST_API_KEY = "localtest"

const WETH_ADDR = {
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

const localTokenAddrs = {
    usdc: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    usdt: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    dai: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
    weth: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
}

class DataServer {
    constructor(apiKey = "") {
        this.apiKey = apiKey ? apiKey : global.apiKey
        this.id = global.orgInfo.id
        this.name = global.orgInfo.name
    }

    async storeUserOp({ op, balance = 0, receipt = {} }) {
        if (this.apiKey == TEST_API_KEY) {
            return
        }
        const userOp = await getPromiseFromOp(op)
        const body = {
            userOp,
            type: "executeUserOp",
            balance,
            receipt,
            organization: this.id,
            orgName: this.name,
            receipt: receipt
        }
        await this.sendPostRequest(APIURL, "save-user-op", body).then((r) => {
            console.log(r.message+" with storeUserOp" )
        })
        return userOpHash
    }

    async storeEVMCall(receipt) {
        if (this.apiKey == TEST_API_KEY) {
            return
        }

        const body = {
            receipt,
            txHash: receipt.transactionHash,
            organization: this.id,
            orgName: this.name
        }
        return await this.sendPostRequest(APIURL, "save-evm-receipt", body).then(r => {
            console.log(r.message + " type: evm_receipt")
            return r
        })
    }

    static async getTokenInfo(symbol, chain) {
        symbol = symbol.toLowerCase()
        let body, tokenInfo;

        body = {
            symbol,
            chain
        }
        if (chain == LOCAL_FORK_CHAIN_ID || chain == FUN_TESTNET_CHAIN_ID) {
            const addr = localTokenAddrs[symbol]
            if (addr) {
                return addr
            }
            body = {
                symbol,
                chain: 1
            }
        }
        if (symbol == "weth" && WETH_ADDR[chain]) {
            return WETH_ADDR[chain][symbol]
        }

        tokenInfo = await this.sendPostRequest(APIURL, "get-erc-token", body).then(r => {
            return r.data
        })
        if (tokenInfo.contract_address) {
            return tokenInfo.contract_address
        }
        const helper = new Helper("token", this.symbol, "token symbol doesn't exist")
        throw new ServerMissingDataError("Token.getAddress", "DataServer", helper)
    }

    async sendGetRequest(APIURL, endpoint) {
        return await sendRequest(`${APIURL}/${endpoint}`, "GET", this.apiKey)
    }

    static async sendGetRequest(APIURL, endpoint, apiKey) {
        return await sendRequest(`${APIURL}/${endpoint}`, "GET", apiKey)
    }

    async sendPostRequest(APIURL, endpoint, body) {
        return await sendRequest(`${APIURL}/${endpoint}`, "POST", this.apiKey, body)
    }

    static async sendPostRequest(APIURL, endpoint, body) {
        return await sendRequest(`${APIURL}/${endpoint}`, "POST", "", body)
    }

    static async getChainInfo(chain) {
        chain = chain.toString();
        if (!Number(chain)) {
            return await this.getChainFromName(chain)
        }
        const body = { chain }

        if (Number(chain) == LOCAL_FORK_CHAIN_ID) {
            return await this.sendPostRequest(LOCAL_URL, "get-chain-info", body).then((r) => {
                return r
            })
        } else {
            return await this.sendPostRequest(APIURL, "get-chain-info", body).then((r) => {
                return r.data
            })
        }
    }

    static async getChainFromName(name) {
        if (name == LOCAL_FORK_CHAIN_KEY) {
            return await this.sendPostRequest(LOCAL_URL, "get-chain-info", { chain: name }).then((r) => {
                return r
            })
        } else {
            return await this.sendPostRequest(APIURL, "get-chain-from-name", { name }).then((r) => {
                return r.data
            })
        }
    }

    static async getModuleInfo(moduleName, chainId) {
        const body = {
            module: moduleName,
            chain: chainId.toString()
        }

        if (chainId != LOCAL_FORK_CHAIN_ID) {
            return await this.sendPostRequest(APIURL, "get-module-info", body).then((r) => {
                return r.data
            })
        } else {
            return await this.sendPostRequest(LOCAL_URL, "get-module-info", body).then((r) => {
                return r
            })
        }
    }

    static async getPaymasterAddress(chainId) {
        const { moduleAddresses: { paymaster: { paymasterAddress } } } = await this.getChainInfo(chainId)
        return paymasterAddress
    }
}

module.exports = { DataServer }
