const { generateSha256, getPromiseFromOp, sendRequest } = require('./Tools')

const LOCAL_FORK_CHAIN_ID = 31337
const APIURL = 'https://vyhjm494l3.execute-api.us-west-2.amazonaws.com/prod'
const APIURL2 = "https://zl8bx9p7f4.execute-api.us-west-2.amazonaws.com/Prod"
const LOCAL_URL = "http://localhost:3000"
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
class DataServer {
    constructor(apiKey = "") {
        this.apiKey = apiKey
    }

    async init() {
        const orgInfo = await this.getOrgInfo()
        this.id = orgInfo.id
        this.name = orgInfo.name
    }

    async getOrgInfo() {
        if (this.apiKey == TEST_API_KEY) {
            return {id: "test", name: "test"}
        }
        return await this.sendGetRequest(APIURL2, "apikey").then((r) => {
            return r.data
        })
    }

    async storeUserOp({ op, type, balance = 0, receipt = {} }) {
        if (this.apiKey == TEST_API_KEY) {
            return
        }

        const userOp = await getPromiseFromOp(op)
        const userOpHash = generateSha256(userOp.signature.toString())
        const body = {
            userOpHash, userOp, type, balance, receipt,
            organization: this.id,
            orgName: this.name,
            receipt: receipt

        }

        await this.sendPostRequest(APIURL, "save-user-op", body).then((r) => {
            console.log(r.message + " type: " + type)
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
        if (chain != LOCAL_FORK_CHAIN_ID) {
            if (symbol == "weth" && WETH_ADDR[chain]) {
                return { contract_address: WETH_ADDR[chain][symbol] }
            }
            const body = {
                symbol,
                chain
            }
            return await this.sendPostRequest(APIURL, "get-erc-token", body).then(r => {
                return r.data
            })
        } else {
            if (symbol == "usdc") {
                return { contract_address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" }
            } else if (symbol == "usdt") {
                return { contract_address: "0xA02f6adc7926efeBBd59Fd43A84f4E0c0c91e832" }
            } else if (symbol == "dai") {
                return { contract_address: "0x6B175474E89094C44Da98b954EedeAC495271d0F" }
            } else if (symbol == "weth") {
                return { contract_address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2" }
            }
        }
    }

    async sendGetRequest(APIURL, endpoint) {
        return await sendRequest(`${APIURL}/${endpoint}`, "GET", this.apiKey)
    }

    async sendPostRequest(APIURL, endpoint, body) {
        return await sendRequest(`${APIURL}/${endpoint}`, "POST", this.apiKey, body)
    }

    static async sendPostRequest(APIURL, endpoint, body) {
        return await sendRequest(`${APIURL}/${endpoint}`, "POST", "", body)
    }

    static async getChainInfo(chainId) {
        const body = { chain: chainId.toString() }
        if (chainId != LOCAL_FORK_CHAIN_ID) {
            const body = { chain: chainId }
            return await this.sendPostRequest(APIURL, "get-chain-info", body).then((r) => {
                return r.data
            })
        } else {
            return await this.sendPostRequest(LOCAL_URL, "get-chain-info", body).then((r) => {
                return r
            })
        }
    }

    async getChainFromName(name) {
        return new Promise(async (res, rej) => {
            const body = { name }
            this.sendPostRequest(APIURL, "get-chain-from-name", body).then((r) => {
                if(r.data){
                    return res(r.data)
                } else {
                    return rej({err: "No chain found"})
                }
            })
        })
       
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
        }
        else {
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
