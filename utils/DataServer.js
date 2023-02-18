const { generateSha256, getPromiseFromOp, sendRequest } = require('./tools')
const ethers = require("ethers")
const testConfig = require("../test/testConfig.json")
const { EOA_AAVE_WITHDRAWAL_MODULE_NAME, TOKEN_SWAP_MODULE_NAME } = require("../src/modules/Module")

const LOCAL_FORK_CHAIN_ID = 31337
const APIURL = 'https://vyhjm494l3.execute-api.us-west-2.amazonaws.com/prod'
const APIURL2 = "https://zl8bx9p7f4.execute-api.us-west-2.amazonaws.com/Prod"
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
        return await this.sendGetRequest(APIURL2, "apikey").then((r) => {
            return r.data
        })
    }

    async getStoredUserOp(userOpHash) {
        const body = { userOpHash }
        const op = await this.sendPostRequest(APIURL, "get-user-op", body).then((r) => {
            return r.data
        })

        Object.keys(op).map(key => {
            if (op[key].type == "BigNumber") {
                op[key] = ethers.BigNumber.from(op[key].hex)
            }
        })
        return op
    }

    async storeUserOp({ op, type, balance = 0, receipt = {} }) {
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
                return { contract_address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"}
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
        if (chainId != LOCAL_FORK_CHAIN_ID) {
            const body = { chain:chainId }
            return await this.sendPostRequest(APIURL, "get-chain-info", body).then((r) => {
                return r.data
            })
        } else {
            return {
                rpcdata: { bundlerUrl:"http://localhost:3000/rpc" },
                aaData: { 
                    entryPointAddress: testConfig.entryPointAddress, 
                    factoryAddress: testConfig.factoryAddress,
                    verificationAddress: testConfig.verificationAddress
                }
            }
        }
    }

    static async getModuleInfo(moduleName, chainId) {
        if (chainId != LOCAL_FORK_CHAIN_ID) {
            const body = {
                module: moduleName,
                chain: chainId
            }
            return await this.sendPostRequest("get-module-info", body).then((r) => {
                return r.data
            })
        } else {
            if (moduleName == EOA_AAVE_WITHDRAWAL_MODULE_NAME) {
                return { eoaAaveWithdrawAddress: testConfig.eoaAaveWithdrawAddress }
            } else if (moduleName == TOKEN_SWAP_MODULE_NAME) {
                return { 
                    tokenSwapAddress: testConfig.tokenSwapAddress, 
                    univ3router: testConfig.uniswapV3RouterAddress, 
                    univ3quoter: testConfig.quoterContractAddress, 
                    univ3factory: testConfig.poolFactoryAddress
                }
            }
        }
    }
}

module.exports = { DataServer }
